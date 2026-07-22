-- Migration: Create sessionactivity table
-- Stores the full candidate RedisJSON cache on logout so no data is lost.

CREATE TABLE IF NOT EXISTS sessionactivity (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id              UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    session_token             TEXT        NOT NULL,
    cache_key                 TEXT,

    -- Phase 1 — Future-roles / resume data
    best_fit_industry         TEXT,
    possible_job_titles       JSONB,
    core_skills               JSONB,
    tools_and_technologies    JSONB,
    education                 TEXT,
    certifications            JSONB,
    work_experience           TEXT,
    projects                  TEXT,
    inferred_seniority        TEXT,
    all_plausible_future_roles JSONB,
    confidence_scores         JSONB,
    why_suggested             JSONB,

    -- Phase 2 — Analysis (all roles combined)
    analysis                  JSONB,
    roles_analysed            JSONB,

    -- Full cache snapshot (complete JSON dump — nothing lost)
    full_cache_snapshot       JSONB,

    -- Timestamps
    session_started_at        TIMESTAMP,
    logged_out_at             TIMESTAMP   NOT NULL DEFAULT NOW(),
    created_timestamp         TIMESTAMP   DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS ix_sessionactivity_candidate_id ON sessionactivity (candidate_id);
CREATE INDEX IF NOT EXISTS ix_sessionactivity_session_token ON sessionactivity (session_token);
CREATE INDEX IF NOT EXISTS ix_sessionactivity_logged_out_at ON sessionactivity (logged_out_at);
