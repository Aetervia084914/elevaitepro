"""Write session and stage results to PostgreSQL."""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

logger = logging.getLogger(__name__)


async def create_session(
    conn: AsyncConnection,
    session_id: UUID,
    content_hash: str,
    file_format: str,
    file_size_bytes: int,
) -> None:
    """Insert a new session row."""
    try:
        await conn.execute(
            """
            INSERT INTO public.sessions
                (id, content_hash, file_format, file_size_bytes)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (str(session_id), content_hash, file_format, file_size_bytes),
        )
        await conn.commit()
        logger.debug("Session %s created", session_id)
    except Exception:
        logger.exception("Failed to create session %s", session_id)


async def write_stage(
    conn: AsyncConnection,
    session_id: UUID,
    stage_number: int,
    stage_name: str,
    status: str,
    execution_time_ms: float,
    stageoutput: dict[str, Any] | None = None,
    error_message: str | None = None,
    extraction_type: str = "certification",
) -> None:
    """Insert a stage result row."""
    try:
        await conn.execute(
            """
            INSERT INTO public.stage_results
                (session_id, stage_number, stage_name, extraction_type,
                 status, execution_time_ms, stageoutput, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (session_id, stage_number)
            DO UPDATE SET
                status = EXCLUDED.status,
                execution_time_ms = EXCLUDED.execution_time_ms,
                stageoutput = EXCLUDED.stageoutput,
                error_message = EXCLUDED.error_message
            """,
            (
                str(session_id),
                stage_number,
                stage_name,
                extraction_type,
                status,
                round(execution_time_ms, 2),
                Jsonb(stageoutput) if stageoutput else None,
                error_message,
            ),
        )
        await conn.commit()
        logger.debug("Stage %d (%s) written for session %s", stage_number, stage_name, session_id)
    except Exception:
        logger.exception("Failed to write stage %d for session %s", stage_number, session_id)


async def complete_session(
    conn: AsyncConnection,
    session_id: UUID,
    alias_count: int,
    processing_ms: int,
) -> None:
    """Mark session as completed."""
    try:
        await conn.execute(
            """
            UPDATE public.sessions
            SET pipeline_status = 'completed',
                alias_count = %s,
                processing_ms = %s,
                completed_at = NOW()
            WHERE id = %s
            """,
            (alias_count, processing_ms, str(session_id)),
        )
        await conn.commit()
    except Exception:
        logger.exception("Failed to complete session %s", session_id)


async def fail_session(
    conn: AsyncConnection,
    session_id: UUID,
    error_message: str,
    processing_ms: int,
) -> None:
    """Mark session as failed."""
    try:
        await conn.execute(
            """
            UPDATE public.sessions
            SET pipeline_status = 'failed',
                error_message = %s,
                processing_ms = %s,
                completed_at = NOW()
            WHERE id = %s
            """,
            (error_message, processing_ms, str(session_id)),
        )
        await conn.commit()
    except Exception:
        logger.exception("Failed to fail session %s", session_id)
