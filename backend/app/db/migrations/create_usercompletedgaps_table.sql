-- Migration: Create usercompletedgaps table
-- Persists completion state for learning items shown on the Dashboard Analysis page
-- (Skill Gaps, AI Skills, Competencies, Certifications, Certification Steps).
-- Scoped per uploaded CV AND per target role, mapped User -> Candidate -> Uploaded CV.
-- One row per (user_cv_upload_id, target_role, item_type, item_id). Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS usercompletedgaps (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_id      UUID        NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    user_cv_upload_id UUID        NOT NULL REFERENCES user_cv_upload(id) ON DELETE CASCADE,
    target_role       TEXT        NOT NULL DEFAULT '',
    region            TEXT        NOT NULL DEFAULT '',
    item_type         VARCHAR(32) NOT NULL,   -- SkillGap | AISkill | Competency | Certification | CertificationStep
    item_id           TEXT        NOT NULL,   -- sg-1, ai-1, comp-1, cert-1, step-1-1
    item_title        TEXT        DEFAULT '',
    is_completed      BOOLEAN     NOT NULL DEFAULT TRUE,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_usercompletedgaps
        UNIQUE (user_cv_upload_id, target_role, item_type, item_id)
);

-- Composite index for the dashboard load query (candidate + CV + role)
CREATE INDEX IF NOT EXISTS ix_usercompletedgaps_lookup
    ON usercompletedgaps (candidate_id, user_cv_upload_id, target_role);
