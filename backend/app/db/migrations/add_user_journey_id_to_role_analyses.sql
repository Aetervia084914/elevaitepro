-- Migration: Link role_analyses to userjourney
-- Adds user_journey_id FK and analysis_status to role_analyses for
-- referential integrity between uploaded resume, journey stage, and suggested roles.

-- 1. Add user_journey_id column (nullable initially to allow backfill)
ALTER TABLE role_analyses
    ADD COLUMN IF NOT EXISTS user_journey_id UUID
        REFERENCES userjourney(id) ON DELETE SET NULL;

-- 2. Add analysis_status to track per-role completion within a journey
ALTER TABLE role_analyses
    ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'completed'
        CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'));

-- 3. Backfill user_journey_id for existing rows via candidate_id → userjourney.user_id
UPDATE role_analyses ra
SET    user_journey_id = uj.id
FROM   userjourney uj
WHERE  uj.user_id = ra.candidate_id
  AND  ra.user_journey_id IS NULL;

-- 4. Index for efficient FK lookups
CREATE INDEX IF NOT EXISTS ix_role_analyses_user_journey_id
    ON role_analyses (user_journey_id);

-- 5. Composite index: fetch all analyses for a journey in one scan
CREATE INDEX IF NOT EXISTS ix_role_analyses_journey_status
    ON role_analyses (user_journey_id, analysis_status);
