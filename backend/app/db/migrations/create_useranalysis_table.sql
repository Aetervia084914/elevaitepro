-- Migration: Create useranalysis table
-- Stores GetAnalysis API responses with full JSONB data
-- Linked to candidates, userjourney, and role_analyses tables
-- Tracks which component triggered the analysis (hero.jsx or sidebar)

CREATE TABLE IF NOT EXISTS useranalysis (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id    UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    user_journey_id UUID        REFERENCES userjourney(id) ON DELETE SET NULL,
    role_analysis_id UUID       REFERENCES role_analyses(id) ON DELETE CASCADE,
    target_role     TEXT        NOT NULL,
    region          TEXT        NOT NULL DEFAULT 'United Kingdom',
    analysis_response JSONB     NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'completed',
    api_source      VARCHAR(50) DEFAULT 'getanalysis',
    triggered_from  VARCHAR(50) NOT NULL,  -- 'hero' or 'sidebar'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT uq_useranalysis_journey_role_region
        UNIQUE (user_journey_id, target_role, region)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_useranalysis_candidate_id 
    ON useranalysis (candidate_id);
CREATE INDEX IF NOT EXISTS idx_useranalysis_user_journey_id 
    ON useranalysis (user_journey_id);
CREATE INDEX IF NOT EXISTS idx_useranalysis_role_analysis_id 
    ON useranalysis (role_analysis_id);
CREATE INDEX IF NOT EXISTS idx_useranalysis_created_at 
    ON useranalysis (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_useranalysis_target_role 
    ON useranalysis (target_role);
CREATE INDEX IF NOT EXISTS idx_useranalysis_triggered_from 
    ON useranalysis (triggered_from);

-- Composite index for common query: get all analyses for a candidate in descending order
CREATE INDEX IF NOT EXISTS idx_useranalysis_candidate_created
    ON useranalysis (candidate_id, created_at DESC);
