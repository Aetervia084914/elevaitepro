from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import Candidate, SupportTicket

TICKET_PREFIX = "TKT"


# DDL kept in sync with migrations/create_support_tickets.sql so the table is
# auto-created on startup whether or not the migration was run manually.
_ENSURE_SCHEMA_SQL = """
CREATE SEQUENCE IF NOT EXISTS support_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS support_tickets (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seq_no          BIGINT      NOT NULL,
    ticket_number   TEXT        NOT NULL UNIQUE,
    candidate_id    UUID        REFERENCES candidates(id) ON DELETE SET NULL,
    name            TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    subject         TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'open',
    team_email_sent BOOLEAN     NOT NULL DEFAULT false,
    user_email_sent BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_candidate_id ON support_tickets (candidate_id);
CREATE INDEX IF NOT EXISTS ix_support_tickets_email        ON support_tickets (email);
CREATE INDEX IF NOT EXISTS ix_support_tickets_created_at   ON support_tickets (created_at);
"""


def ensure_support_tickets_schema(session: Session) -> None:
    """Create the support_tickets table + sequence if they don't exist."""
    session.execute(text(_ENSURE_SCHEMA_SQL))
    session.commit()


def format_ticket_number(seq_no: int) -> str:
    """Format a raw sequence value as a human-readable ticket number."""
    return f"{TICKET_PREFIX}-{seq_no:06d}"


class SupportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _next_seq(self) -> int:
        """Pull the next value from the Postgres support ticket sequence."""
        result = self._session.execute(text("SELECT nextval('support_ticket_seq')"))
        return int(result.scalar_one())

    def _candidate_id_for_email(self, email: str) -> uuid.UUID | None:
        candidate = (
            self._session.query(Candidate)
            .filter(Candidate.email == email)
            .first()
        )
        return candidate.id if candidate else None

    def create_ticket(
        self,
        name: str,
        email: str,
        subject: str,
        description: str,
    ) -> SupportTicket:
        """Persist a new support ticket and return it (with ticket_number set).

        Links to a candidate when the submitter's email matches an account;
        stores name/email standalone otherwise.
        """
        seq_no = self._next_seq()
        ticket = SupportTicket(
            id=uuid.uuid4(),
            seq_no=seq_no,
            ticket_number=format_ticket_number(seq_no),
            candidate_id=self._candidate_id_for_email(email),
            name=name,
            email=email,
            subject=subject,
            description=description,
        )
        self._session.add(ticket)
        self._session.commit()
        self._session.refresh(ticket)
        return ticket

    def mark_emails_sent(
        self,
        ticket: SupportTicket,
        *,
        team: bool | None = None,
        user: bool | None = None,
    ) -> None:
        """Record which notification emails were successfully sent."""
        if team is not None:
            ticket.team_email_sent = team
        if user is not None:
            ticket.user_email_sent = user
        self._session.commit()
