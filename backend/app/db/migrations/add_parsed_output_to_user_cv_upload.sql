-- Migration: Add parsed_output column to user_cv_upload
-- Stores the raw parsed output from the OpenAI getresume_futureroles call
-- exactly as returned by the LLM — no reshaping or normalisation applied.
-- Populated by a background UPDATE after the LLM call completes.

ALTER TABLE public.user_cv_upload
    ADD COLUMN IF NOT EXISTS parsed_output JSONB;

-- Optional GIN index for fast JSONB queries against parsed_output fields
-- (e.g. WHERE parsed_output @> '{"best_fit_industry": "IT"}')
CREATE INDEX IF NOT EXISTS ix_user_cv_upload_parsed_output
    ON public.user_cv_upload USING GIN (parsed_output)
    WHERE parsed_output IS NOT NULL;

COMMENT ON COLUMN public.user_cv_upload.parsed_output IS
    'Raw JSONB output from the OpenAI getresume_futureroles LLM call. '
    'Contains: best_fit_industry, possible_job_titles, core_skills, '
    'tools_and_technologies, profile_summary, education, certifications, '
    'work_experience, projects, inferred_seniority, all_plausible_future_roles, '
    'confidence_scores, why_suggested.';
