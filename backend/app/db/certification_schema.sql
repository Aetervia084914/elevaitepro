-- ═══════════════════════════════════════════════════════════════════════════
-- Elevaite — Unified Database Schema
-- All CREATE TABLE / CREATE INDEX use IF NOT EXISTS → safe to re-run.
-- Executed in dependency order (FKs reference earlier tables).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Extensions (guarded — pgvector may not be installed on all hosts)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available — semantic search (Stage 3C) will be disabled';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Skill Normalizer — Taxonomy Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1.1 taxonomy_skills (root table — all FKs point here) ──────
CREATE TABLE IF NOT EXISTS public.taxonomy_skills (
    skill_id            SERIAL      PRIMARY KEY,
    canonical_name      TEXT        NOT NULL UNIQUE,
    lightcast_id        TEXT,
    esco_uri            TEXT,
    onet_element_id     TEXT,
    skill_type          VARCHAR(30),
    skill_category_flags TEXT[],
    industry_tags       TEXT[],
    onet_importance     NUMERIC(4,2)  DEFAULT 0,
    confidence_floor    NUMERIC(4,2)  DEFAULT 0.62,
    description         TEXT,
    created_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_industry_tags  ON public.taxonomy_skills USING GIN (industry_tags);
CREATE INDEX IF NOT EXISTS idx_skills_lightcast_id   ON public.taxonomy_skills (lightcast_id) WHERE lightcast_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_esco_uri       ON public.taxonomy_skills (esco_uri) WHERE esco_uri IS NOT NULL;

-- ── 1.2 taxonomy_aliases ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_aliases (
    alias_id            SERIAL      PRIMARY KEY,
    alias_lower         TEXT        NOT NULL,
    skill_id            INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    alias_source        VARCHAR(30),
    locale              CHAR(5),
    confidence_modifier NUMERIC(4,2) DEFAULT 0.0,
    UNIQUE (alias_lower, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_aliases_alias_lower_trgm ON public.taxonomy_aliases USING GIN (alias_lower gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_aliases_skill_id         ON public.taxonomy_aliases (skill_id);

-- ── 1.3 taxonomy_skill_signals ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_skill_signals (
    signal_id           SERIAL      PRIMARY KEY,
    skill_id            INT         NOT NULL UNIQUE REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    bls_growth_rate     NUMERIC(5,2),
    median_wage_usd     INT,
    cedefop_demand_score NUMERIC(5,3),
    shortage_flag       BOOL        DEFAULT FALSE,
    oecd_demand_score   NUMERIC(5,3),
    kaggle_phrase_freq  INT,
    validated_by_kaggle BOOL        DEFAULT FALSE,
    last_updated        TIMESTAMPTZ
);

-- ── 1.4 taxonomy_skill_relations ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_skill_relations (
    relation_id         SERIAL      PRIMARY KEY,
    child_skill_id      INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    parent_skill_id     INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    relation_type       VARCHAR(20),
    source              VARCHAR(20)
);

DO $$ BEGIN
    ALTER TABLE public.taxonomy_skill_relations
        ADD CONSTRAINT uq_skill_relations UNIQUE (child_skill_id, parent_skill_id, source);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- ── 1.5 taxonomy_phrase_patterns ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_phrase_patterns (
    pattern_id          SERIAL      PRIMARY KEY,
    pattern_regex       TEXT        NOT NULL,
    skill_id            INT         REFERENCES public.taxonomy_skills(skill_id) ON DELETE SET NULL,
    base_confidence     NUMERIC(4,2)  DEFAULT 0.70,
    kaggle_frequency    INT           DEFAULT 0,
    domain_hint         VARCHAR(40),
    source              VARCHAR(20),
    priority            SMALLINT      DEFAULT 0
);

DO $$ BEGIN
    ALTER TABLE public.taxonomy_phrase_patterns
        ADD COLUMN domain_weight NUMERIC(4,3) DEFAULT 1.0;
EXCEPTION WHEN duplicate_column OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_phrase_patterns_skill_id ON public.taxonomy_phrase_patterns (skill_id);

-- ── 1.6 taxonomy_skill_embeddings (pgvector) ───────────────────
-- Guarded: table requires the vector extension.
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS public.taxonomy_skill_embeddings (
        embedding_id        SERIAL      PRIMARY KEY,
        skill_id            INT         NOT NULL UNIQUE REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
        embedding           vector(384),
        model_version       VARCHAR(60),
        computed_at         TIMESTAMPTZ
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'taxonomy_skill_embeddings skipped — pgvector not available';
END $$;
-- NOTE: IVFFlat index is NOT created here — requires populated data.
-- Run post_etl_index.py AFTER Stage 0A loads all embeddings.

-- ── 1.7 taxonomy_crosswalk ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_crosswalk (
    crosswalk_id        SERIAL      PRIMARY KEY,
    skill_id            INT         REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    source_taxonomy     VARCHAR(20),
    external_id         TEXT,
    UNIQUE (source_taxonomy, external_id)
);

-- ── 1.8 taxonomy_wikidata_aliases ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_wikidata_aliases (
    wd_alias_id         SERIAL      PRIMARY KEY,
    wikidata_qid        VARCHAR(20),
    preferred_label     TEXT,
    alt_label           TEXT,
    skill_id            INT         REFERENCES public.taxonomy_skills(skill_id) ON DELETE SET NULL,
    fetched_at          TIMESTAMPTZ
);

-- ── 1.9 taxonomy_skill_blacklist ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_skill_blacklist (
    blacklist_id        SERIAL      PRIMARY KEY,
    term_lower          TEXT        NOT NULL UNIQUE,
    reason              TEXT,
    whitelist_override  BOOL        DEFAULT FALSE
);

-- ── 1.10 taxonomy_skill_cooccurrence ───────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_skill_cooccurrence (
    skill_id_a          INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    skill_id_b          INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    co_count            INT         NOT NULL DEFAULT 0,
    source              VARCHAR(20),
    last_computed_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (skill_id_a, skill_id_b),
    CHECK (skill_id_a < skill_id_b)
);

CREATE INDEX IF NOT EXISTS idx_cooccurrence_skill_id_b ON public.taxonomy_skill_cooccurrence (skill_id_b);
CREATE INDEX IF NOT EXISTS idx_cooccurrence_co_count   ON public.taxonomy_skill_cooccurrence (co_count DESC);

-- ── 1.11 taxonomy_skill_industry ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_skill_industry (
    id                  SERIAL      PRIMARY KEY,
    skill_id            INT         NOT NULL REFERENCES public.taxonomy_skills(skill_id) ON DELETE CASCADE,
    industry_name       VARCHAR(60),
    career_area         VARCHAR(80),
    occupation_group    VARCHAR(80),
    weight              NUMERIC(4,2) DEFAULT 1.0,
    source              VARCHAR(20),
    UNIQUE (skill_id, industry_name)
);

CREATE INDEX IF NOT EXISTS idx_skill_industry_skill_id ON public.taxonomy_skill_industry (skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_industry_name     ON public.taxonomy_skill_industry (industry_name);

-- ── 1.12 taxonomy_etl_runs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.taxonomy_etl_runs (
    etl_run_id          BIGSERIAL   PRIMARY KEY,
    etl_stage           VARCHAR(10),
    source              VARCHAR(80),
    records_loaded      INT,
    records_failed      INT         DEFAULT 0,
    taxonomy_version    VARCHAR(20),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error               TEXT
);

CREATE INDEX IF NOT EXISTS idx_etl_runs_stage ON public.taxonomy_etl_runs (etl_stage);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Skill Normalizer — Detection / Trace Tables
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.skill_detections (
    detection_id        BIGSERIAL   PRIMARY KEY,
    request_id          UUID        NOT NULL UNIQUE,
    content_hash        CHAR(64),
    file_format         VARCHAR(10),
    detected_language   CHAR(5),
    skills              TEXT[],
    skill_ids           INT[],
    extraction_method   VARCHAR(20),
    skill_count         SMALLINT,
    completed_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_detections_hash ON public.skill_detections (content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.skill_detection_trace (
    trace_id            BIGSERIAL   PRIMARY KEY,
    request_id          UUID        NOT NULL,
    skill_id            INT         REFERENCES public.taxonomy_skills(skill_id) ON DELETE SET NULL,
    source_stage        VARCHAR(10),
    matched_text        TEXT,
    confidence          NUMERIC(4,2),
    accepted            BOOL,
    reject_reason       TEXT
);

CREATE INDEX IF NOT EXISTS idx_detection_trace_request_id ON public.skill_detection_trace (request_id);

DO $$ BEGIN
    ALTER TABLE public.skill_detection_trace
        ADD CONSTRAINT fk_trace_request_id
        FOREIGN KEY (request_id) REFERENCES public.skill_detections(request_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Certification Normalizer — Core Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 3.1 certifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certifications (
    id                  TEXT        PRIMARY KEY,
    name                TEXT        NOT NULL,
    abbreviation        TEXT,
    issuing_body        TEXT        NOT NULL DEFAULT 'Unknown',
    issuing_body_url    TEXT,
    url                 TEXT,
    industry            JSONB       NOT NULL DEFAULT '[]'::jsonb,
    level               TEXT        NOT NULL DEFAULT 'unknown',
    skills_covered      JSONB       NOT NULL DEFAULT '[]'::jsonb,
    prerequisites       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    validity_years      INTEGER,
    exam_format         TEXT,
    avg_cost_usd        INTEGER,
    aliases             JSONB       NOT NULL DEFAULT '[]'::jsonb,
    ncca_accredited     BOOLEAN     NOT NULL DEFAULT FALSE,
    tags                JSONB       NOT NULL DEFAULT '[]'::jsonb,
    source              JSONB       NOT NULL DEFAULT '[]'::jsonb,
    last_verified_date  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_name          ON public.certifications(name);
CREATE INDEX IF NOT EXISTS idx_certifications_abbreviation  ON public.certifications(abbreviation);
CREATE INDEX IF NOT EXISTS idx_certifications_issuing_body  ON public.certifications(issuing_body);
CREATE INDEX IF NOT EXISTS idx_certifications_level         ON public.certifications(level);
CREATE INDEX IF NOT EXISTS idx_certifications_industry      ON public.certifications USING GIN (industry);

-- ── 3.2 cert_aliases ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cert_aliases (
    id          BIGSERIAL   PRIMARY KEY,
    cert_id     TEXT        NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
    alias       TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cert_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_cert_aliases_cert_id ON public.cert_aliases(cert_id);
CREATE INDEX IF NOT EXISTS idx_cert_aliases_alias   ON public.cert_aliases(alias);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Shared Pipeline Tracking (used by both skill + cert pipelines)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 4.1 sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash    TEXT        NOT NULL,
    file_format     TEXT        NOT NULL,
    file_size_bytes INTEGER     NOT NULL,
    pipeline_status TEXT        NOT NULL DEFAULT 'started',
    total_stages    SMALLINT    NOT NULL DEFAULT 5,
    alias_count     INTEGER,
    processing_ms   INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Widen alias_count from SMALLINT to INTEGER for large alias sets
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'sessions'
          AND column_name  = 'alias_count'
          AND data_type    = 'smallint'
    ) THEN
        ALTER TABLE public.sessions ALTER COLUMN alias_count TYPE INTEGER;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_content_hash ON public.sessions(content_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at   ON public.sessions(created_at DESC);

-- ── 4.2 stage_results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stage_results (
    id                BIGSERIAL   PRIMARY KEY,
    session_id        UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    stage_number      SMALLINT    NOT NULL,
    stage_name        TEXT        NOT NULL,
    extraction_type   TEXT        NOT NULL DEFAULT 'certification',
    status            TEXT        NOT NULL,
    execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    stageoutput       JSONB,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, stage_number)
);

-- Ensure extraction_type column exists on pre-existing table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'stage_results'
          AND column_name  = 'extraction_type'
    ) THEN
        ALTER TABLE public.stage_results
            ADD COLUMN extraction_type TEXT NOT NULL DEFAULT 'certification';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stage_results_session_id        ON public.stage_results(session_id);
CREATE INDEX IF NOT EXISTS idx_stage_results_stage_number      ON public.stage_results(stage_number);
CREATE INDEX IF NOT EXISTS idx_stage_results_status            ON public.stage_results(status);
CREATE INDEX IF NOT EXISTS idx_stage_results_extraction_type   ON public.stage_results(extraction_type);
