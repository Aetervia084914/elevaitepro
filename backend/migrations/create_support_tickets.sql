-- Migration: Create support_tickets table + sequence
-- Persists every support ticket raised via the Support Centre form, with a
-- human-readable ticket number (TKT-000123) backed by a Postgres sequence.

-- Sequence that backs the human-readable ticket number.
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seq_no          BIGINT      NOT NULL,                              -- raw sequence value
    ticket_number   TEXT        NOT NULL UNIQUE,                       -- formatted, e.g. TKT-000123
    candidate_id    UUID        REFERENCES candidates(id) ON DELETE SET NULL,  -- linked when email matches an account

    -- Submitter details (always stored, even for anonymous submitters)
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    subject         TEXT        NOT NULL,
    description     TEXT        NOT NULL,

    -- Lifecycle / delivery tracking
    status          TEXT        NOT NULL DEFAULT 'open',
    team_email_sent BOOLEAN     NOT NULL DEFAULT false,
    user_email_sent BOOLEAN     NOT NULL DEFAULT false,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS ix_support_tickets_candidate_id ON support_tickets (candidate_id);
CREATE INDEX IF NOT EXISTS ix_support_tickets_email        ON support_tickets (email);
CREATE INDEX IF NOT EXISTS ix_support_tickets_created_at   ON support_tickets (created_at);
