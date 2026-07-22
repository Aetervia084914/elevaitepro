-- ═══════════════════════════════════════════════════════════════════════════
-- Elevaite — Unified Database Schema  (db.sql)
-- All CREATE TABLE / CREATE INDEX use IF NOT EXISTS → safe to re-run.
-- Executed in dependency order (FKs reference earlier tables).
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Extensions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available — semantic search (Stage 3C) will be disabled';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Core App Tables (Lightcast dropdown data)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS industries (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategories (
    id          SERIAL       PRIMARY KEY,
    industry_id INTEGER      NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    CONSTRAINT uq_subcategories_industry_name UNIQUE (industry_id, name)
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id       VARCHAR(64)  PRIMARY KEY,
    industry_id    INTEGER      NOT NULL REFERENCES industries(id) ON DELETE RESTRICT,
    subcategory_id INTEGER      REFERENCES subcategories(id) ON DELETE SET NULL,
    skill_name     VARCHAR(255) NOT NULL,
    description    TEXT,
    skill_type     VARCHAR(255),
    source_url     TEXT,
    raw_json       JSONB,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS occupations (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS titles (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS skill_occupations (
    id            SERIAL      PRIMARY KEY,
    skill_id      VARCHAR(64) NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    occupation_id INTEGER     NOT NULL REFERENCES occupations(id) ON DELETE CASCADE,
    CONSTRAINT uq_skill_occupations_skill_occ UNIQUE (skill_id, occupation_id)
);

CREATE TABLE IF NOT EXISTS skill_titles (
    id       SERIAL      PRIMARY KEY,
    skill_id VARCHAR(64) NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    title_id INTEGER     NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    CONSTRAINT uq_skill_titles_skill_title UNIQUE (skill_id, title_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_industries_name                ON industries(name);
CREATE INDEX IF NOT EXISTS        ix_subcategories_industry_id      ON subcategories(industry_id);
CREATE INDEX IF NOT EXISTS        ix_skills_industry_id             ON skills(industry_id);
CREATE INDEX IF NOT EXISTS        ix_skills_subcategory_id          ON skills(subcategory_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_occupations_name               ON occupations(name);
CREATE INDEX IF NOT EXISTS        ix_skill_occupations_occupation_id ON skill_occupations(occupation_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Skill Normalizer — Taxonomy Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 2.1 taxonomy_skills (root table — all FKs point here) ──────
CREATE TABLE IF NOT EXISTS taxonomy_skills (
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

CREATE INDEX IF NOT EXISTS idx_skills_industry_tags  ON taxonomy_skills USING GIN (industry_tags);
CREATE INDEX IF NOT EXISTS idx_skills_lightcast_id   ON taxonomy_skills(lightcast_id) WHERE lightcast_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_skills_esco_uri       ON taxonomy_skills(esco_uri) WHERE esco_uri IS NOT NULL;

-- ── 2.2 taxonomy_aliases ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_aliases (
    alias_id            SERIAL      PRIMARY KEY,
    alias_lower         TEXT        NOT NULL,
    skill_id            INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    alias_source        VARCHAR(30),
    locale              CHAR(5),
    confidence_modifier NUMERIC(4,2) DEFAULT 0.0,
    UNIQUE (alias_lower, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_aliases_alias_lower_trgm ON taxonomy_aliases USING GIN (alias_lower gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_aliases_skill_id         ON taxonomy_aliases(skill_id);

-- ── 2.3 taxonomy_skill_signals ─────────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_skill_signals (
    signal_id            SERIAL      PRIMARY KEY,
    skill_id             INT         NOT NULL UNIQUE REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    bls_growth_rate      NUMERIC(5,2),
    median_wage_usd      INT,
    cedefop_demand_score NUMERIC(5,3),
    shortage_flag        BOOL        DEFAULT FALSE,
    oecd_demand_score    NUMERIC(5,3),
    kaggle_phrase_freq   INT,
    validated_by_kaggle  BOOL        DEFAULT FALSE,
    last_updated         TIMESTAMPTZ
);

-- ── 2.4 taxonomy_skill_relations ───────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_skill_relations (
    relation_id     SERIAL      PRIMARY KEY,
    child_skill_id  INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    parent_skill_id INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    relation_type   VARCHAR(20),
    source          VARCHAR(20)
);

DO $$ BEGIN
    ALTER TABLE taxonomy_skill_relations
        ADD CONSTRAINT uq_skill_relations UNIQUE (child_skill_id, parent_skill_id, source);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- ── 2.5 taxonomy_phrase_patterns ───────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_phrase_patterns (
    pattern_id       SERIAL      PRIMARY KEY,
    pattern_regex    TEXT        NOT NULL,
    skill_id         INT         REFERENCES taxonomy_skills(skill_id) ON DELETE SET NULL,
    base_confidence  NUMERIC(4,2)  DEFAULT 0.70,
    kaggle_frequency INT           DEFAULT 0,
    domain_hint      VARCHAR(40),
    source           VARCHAR(20),
    priority         SMALLINT      DEFAULT 0
);

DO $$ BEGIN
    ALTER TABLE taxonomy_phrase_patterns
        ADD COLUMN domain_weight NUMERIC(4,3) DEFAULT 1.0;
EXCEPTION WHEN duplicate_column OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_phrase_patterns_skill_id ON taxonomy_phrase_patterns(skill_id);

-- ── 2.6 taxonomy_skill_embeddings (pgvector) ───────────────────
-- Guarded: table requires the vector extension.
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS taxonomy_skill_embeddings (
        embedding_id  SERIAL      PRIMARY KEY,
        skill_id      INT         NOT NULL UNIQUE REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
        embedding     vector(384),
        model_version VARCHAR(60),
        computed_at   TIMESTAMPTZ
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'taxonomy_skill_embeddings skipped — pgvector not available';
END $$;
-- NOTE: IVFFlat index is NOT created here — requires populated data.
-- Run post_etl_index.py AFTER Stage 0A loads all embeddings.

-- ── 2.7 taxonomy_crosswalk ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_crosswalk (
    crosswalk_id    SERIAL      PRIMARY KEY,
    skill_id        INT         REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    source_taxonomy VARCHAR(20),
    external_id     TEXT,
    UNIQUE (source_taxonomy, external_id)
);

-- ── 2.8 taxonomy_wikidata_aliases ──────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_wikidata_aliases (
    wd_alias_id     SERIAL      PRIMARY KEY,
    wikidata_qid    VARCHAR(20),
    preferred_label TEXT,
    alt_label       TEXT,
    skill_id        INT         REFERENCES taxonomy_skills(skill_id) ON DELETE SET NULL,
    fetched_at      TIMESTAMPTZ
);

-- ── 2.9 taxonomy_skill_blacklist ───────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_skill_blacklist (
    blacklist_id       SERIAL PRIMARY KEY,
    term_lower         TEXT   NOT NULL UNIQUE,
    reason             TEXT,
    whitelist_override BOOL   DEFAULT FALSE
);

-- ── 2.10 taxonomy_skill_cooccurrence ───────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_skill_cooccurrence (
    skill_id_a       INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    skill_id_b       INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    co_count         INT         NOT NULL DEFAULT 0,
    source           VARCHAR(20),
    last_computed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (skill_id_a, skill_id_b),
    CHECK (skill_id_a < skill_id_b)
);

CREATE INDEX IF NOT EXISTS idx_cooccurrence_skill_id_b ON taxonomy_skill_cooccurrence(skill_id_b);
CREATE INDEX IF NOT EXISTS idx_cooccurrence_co_count   ON taxonomy_skill_cooccurrence(co_count DESC);

-- ── 2.11 taxonomy_skill_industry ───────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_skill_industry (
    id               SERIAL      PRIMARY KEY,
    skill_id         INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    industry_name    VARCHAR(60),
    subindustry_name VARCHAR(100),
    career_area      VARCHAR(80),
    occupation_group VARCHAR(80),
    weight           NUMERIC(4,2) DEFAULT 1.0,
    source           VARCHAR(20),
    UNIQUE (skill_id, industry_name)
);

-- Add subindustry_name to existing tables (idempotent)
DO $$ BEGIN
    ALTER TABLE taxonomy_skill_industry ADD COLUMN IF NOT EXISTS subindustry_name VARCHAR(100);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_skill_industry_skill_id ON taxonomy_skill_industry(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_industry_name     ON taxonomy_skill_industry(industry_name);

-- ── 2.11b taxonomy_skill_occupation ──────────────────────────────
-- Clean mapping between skills and their related Lightcast occupations.
-- Each row links one taxonomy skill to one detailed occupation.
CREATE TABLE IF NOT EXISTS taxonomy_skill_occupation (
    id                      SERIAL      PRIMARY KEY,
    skill_id                INT         NOT NULL REFERENCES taxonomy_skills(skill_id) ON DELETE CASCADE,
    lightcast_skill_id      TEXT        NOT NULL,
    occupation_id           VARCHAR(20) NOT NULL,
    unique_occupation_id    VARCHAR(20),
    occupation_name         VARCHAR(255) NOT NULL,
    specialized_occupation  VARCHAR(255),
    occupation_group        VARCHAR(120),
    career_area             VARCHAR(120),
    about                   TEXT,
    occupation_link         TEXT,
    source                  VARCHAR(20) DEFAULT 'lightcast',
    UNIQUE (skill_id, occupation_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_occ_skill_id       ON taxonomy_skill_occupation(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_occ_occupation_id   ON taxonomy_skill_occupation(occupation_id);
CREATE INDEX IF NOT EXISTS idx_skill_occ_occ_group       ON taxonomy_skill_occupation(occupation_group);
CREATE INDEX IF NOT EXISTS idx_skill_occ_career_area     ON taxonomy_skill_occupation(career_area);

-- ── 2.12 taxonomy_etl_runs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS taxonomy_etl_runs (
    etl_run_id       BIGSERIAL   PRIMARY KEY,
    etl_stage        VARCHAR(10),
    source           VARCHAR(80),
    records_loaded   INT,
    records_failed   INT         DEFAULT 0,
    taxonomy_version VARCHAR(20),
    started_at       TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    error            TEXT
);

CREATE INDEX IF NOT EXISTS idx_etl_runs_stage ON taxonomy_etl_runs(etl_stage);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Skill Normalizer — Detection / Trace / Profile Tables
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skill_detections (
    detection_id      BIGSERIAL   PRIMARY KEY,
    request_id        UUID        NOT NULL UNIQUE,
    content_hash      CHAR(64),
    file_format       VARCHAR(10),
    detected_language CHAR(5),
    skills            TEXT[],
    skill_ids         INT[],
    extraction_method VARCHAR(20),
    skill_count       SMALLINT,
    completed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_detections_hash ON skill_detections(content_hash) WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS skill_detection_trace (
    trace_id      BIGSERIAL   PRIMARY KEY,
    request_id    UUID        NOT NULL,
    skill_id      INT         REFERENCES taxonomy_skills(skill_id) ON DELETE SET NULL,
    source_stage  VARCHAR(10),
    matched_text  TEXT,
    confidence    NUMERIC(4,2),
    accepted      BOOL,
    reject_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_detection_trace_request_id ON skill_detection_trace(request_id);

DO $$ BEGIN
    ALTER TABLE skill_detection_trace
        ADD CONSTRAINT fk_trace_request_id
        FOREIGN KEY (request_id) REFERENCES skill_detections(request_id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS skill_profile_detections (
    id                    SERIAL      PRIMARY KEY,
    request_id            UUID        NOT NULL,
    industries            JSONB,
    occupation_groups     JSONB,
    job_level             VARCHAR(20),
    job_level_confidence  NUMERIC(5,4),
    job_level_onet_avg    NUMERIC(6,3),
    job_level_evidence    TEXT[],
    created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Job Posting Tables (external data — used by ETL 0C for validation)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS job_postings_raw (
    posting_id      SERIAL      PRIMARY KEY,
    source          VARCHAR(30),
    title           TEXT,
    tags            TEXT[],
    salary_min      NUMERIC,
    salary_max      NUMERIC,
    seniority_label VARCHAR(30),
    fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_tags_gin      ON job_postings_raw USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_job_postings_title_fts     ON job_postings_raw USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_job_postings_seniority     ON job_postings_raw(seniority_label);

CREATE TABLE IF NOT EXISTS kaggle_job_postings (
    id               SERIAL      PRIMARY KEY,
    source_dataset   VARCHAR(60),
    title            TEXT,
    company          TEXT,
    skills           TEXT[],
    experience_level VARCHAR(30),
    salary_min       NUMERIC,
    salary_max       NUMERIC,
    salary_currency  CHAR(3),
    country          VARCHAR(60),
    posted_date      DATE,
    seniority_label  VARCHAR(30),
    raw_id           TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kaggle_skills_gin  ON kaggle_job_postings USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_kaggle_title_fts   ON kaggle_job_postings USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_kaggle_country     ON kaggle_job_postings(country);


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Certification Normalizer — Core Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 5.1 certifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certifications (
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

CREATE INDEX IF NOT EXISTS idx_certifications_name          ON certifications(name);
CREATE INDEX IF NOT EXISTS idx_certifications_abbreviation  ON certifications(abbreviation);
CREATE INDEX IF NOT EXISTS idx_certifications_issuing_body  ON certifications(issuing_body);
CREATE INDEX IF NOT EXISTS idx_certifications_level         ON certifications(level);
CREATE INDEX IF NOT EXISTS idx_certifications_industry      ON certifications USING GIN (industry);

-- ── 5.2 cert_aliases ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cert_aliases (
    id          BIGSERIAL   PRIMARY KEY,
    cert_id     TEXT        NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    alias       TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cert_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_cert_aliases_cert_id ON cert_aliases(cert_id);
CREATE INDEX IF NOT EXISTS idx_cert_aliases_alias   ON cert_aliases(alias);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Shared Pipeline Tracking (used by both skill + cert pipelines)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 6.1 sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
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
        ALTER TABLE sessions ALTER COLUMN alias_count TYPE INTEGER;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_content_hash ON sessions(content_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at   ON sessions(created_at DESC);

-- ── 6.2 stage_results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stage_results (
    id                BIGSERIAL     PRIMARY KEY,
    session_id        UUID          NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    stage_number      SMALLINT      NOT NULL,
    stage_name        TEXT          NOT NULL,
    extraction_type   TEXT          NOT NULL DEFAULT 'certification',
    status            TEXT          NOT NULL,
    execution_time_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    stageoutput       JSONB,
    error_message     TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
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
        ALTER TABLE stage_results
            ADD COLUMN extraction_type TEXT NOT NULL DEFAULT 'certification';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stage_results_session_id      ON stage_results(session_id);
CREATE INDEX IF NOT EXISTS idx_stage_results_stage_number    ON stage_results(stage_number);
CREATE INDEX IF NOT EXISTS idx_stage_results_status          ON stage_results(status);
CREATE INDEX IF NOT EXISTS idx_stage_results_extraction_type ON stage_results(extraction_type);
