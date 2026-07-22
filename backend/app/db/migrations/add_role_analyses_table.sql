-- Migration: Create role_analyses table
-- Stores ONLY the per-role analysis JSON (no candidate PII).
-- One row per (candidate_id, target_role, region).

CREATE TABLE IF NOT EXISTS role_analyses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID        NOT NULL,
    target_role     TEXT        NOT NULL,
    region          TEXT        NOT NULL DEFAULT 'United Kingdom',
    analysis        JSONB       NOT NULL,
    why_suggested   TEXT        DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_role_analyses_candidate_role_region
        UNIQUE (candidate_id, target_role, region)
);

-- Add why_suggested column if table already exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'role_analyses' AND column_name = 'why_suggested'
    ) THEN
        ALTER TABLE role_analyses ADD COLUMN why_suggested TEXT DEFAULT '';
    END IF;
END $$;

-- B-tree index on candidate_id for fast lookups
CREATE INDEX IF NOT EXISTS ix_role_analyses_candidate_id
    ON role_analyses (candidate_id);

-- GIN index on analysis JSONB for fast internal queries
CREATE INDEX IF NOT EXISTS ix_role_analyses_analysis_gin
    ON role_analyses USING GIN (analysis);
