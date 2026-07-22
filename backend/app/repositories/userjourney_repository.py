from __future__ import annotations

import math
import time
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


INITIAL_STAGE = "UPLOAD_CV"
INITIAL_CREDITS = 1


class UserJourneyRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def ensure_schema(self) -> None:
        self._session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS userjourney (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
                    current_stage VARCHAR(50) NOT NULL DEFAULT 'UPLOAD_CV',
                    credits_remaining INT NOT NULL DEFAULT 1,
                    cv_uploaded BOOLEAN NOT NULL DEFAULT false,
                    analysis_completed_at BIGINT,
                    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
                    updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
                    CONSTRAINT userjourney_user_id_unique UNIQUE (user_id)
                )
                """
            )
        )
        # Add new columns to existing tables that may pre-date this schema version
        for col_ddl in [
            "ALTER TABLE userjourney ADD COLUMN IF NOT EXISTS cv_uploaded BOOLEAN NOT NULL DEFAULT false",
            "ALTER TABLE userjourney ADD COLUMN IF NOT EXISTS analysis_completed_at BIGINT",
        ]:
            self._session.execute(text(col_ddl))
        self._session.flush()

    def get_by_user_id(self, user_id: UUID) -> dict[str, Any] | None:
        self.ensure_schema()
        result = self._session.execute(
            text(
                """
                SELECT id, user_id, current_stage, credits_remaining,
                       cv_uploaded, analysis_completed_at, created_at, updated_at
                FROM userjourney
                WHERE user_id = :user_id
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    def upsert(
        self,
        user_id: UUID,
        current_stage: str = INITIAL_STAGE,
        credits_remaining: int = INITIAL_CREDITS,
    ) -> dict[str, Any]:
        self.ensure_schema()
        now = math.floor(time.time())
        stage = (current_stage or INITIAL_STAGE).strip() or INITIAL_STAGE
        credits = max(0, int(credits_remaining))

        result = self._session.execute(
            text(
                """
                INSERT INTO userjourney (user_id, current_stage, credits_remaining, cv_uploaded, analysis_completed_at, created_at, updated_at)
                VALUES (:user_id, :current_stage, :credits_remaining, false, NULL, :now, :now)
                ON CONFLICT (user_id) DO UPDATE
                SET current_stage = EXCLUDED.current_stage,
                    credits_remaining = EXCLUDED.credits_remaining,
                    updated_at = EXCLUDED.updated_at
                RETURNING id, user_id, current_stage, credits_remaining,
                          cv_uploaded, analysis_completed_at, created_at, updated_at
                """
            ),
            {
                "user_id": user_id,
                "current_stage": stage,
                "credits_remaining": credits,
                "now": now,
            },
        )
        row = result.mappings().one()
        self._session.flush()
        return dict(row)
