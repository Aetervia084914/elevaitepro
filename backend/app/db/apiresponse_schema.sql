-- ═══════════════════════════════════════════════════════════════════════════
-- API Response Timing — tracks execution time for each API call.
-- CREATE TABLE uses IF NOT EXISTS → safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.apiresponse (
    id              BIGSERIAL       PRIMARY KEY,
    api_name        TEXT            NOT NULL,
    time_taken_ms   NUMERIC(12,2)  NOT NULL,
    status          TEXT            NOT NULL DEFAULT 'success',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apiresponse_api_name   ON public.apiresponse (api_name);
CREATE INDEX IF NOT EXISTS idx_apiresponse_created_at ON public.apiresponse (created_at DESC);
