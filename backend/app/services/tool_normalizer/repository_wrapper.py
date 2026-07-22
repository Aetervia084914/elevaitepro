"""PipelineRepository wrapper that writes ``extraction_type = 'tools'``.

The tool_normalizer's ``StageResultRecord`` ORM model does not map the
``extraction_type`` column (the DB column defaults to ``'certification'``).
This wrapper overrides the two methods that INSERT into ``stage_results``
and uses raw SQL so that every row written by the tool extraction pipeline
carries ``extraction_type = 'tools'``.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)


class ToolPipelineRepository:
    """Drop-in replacement for ``PipelineRepository`` with extraction_type='tools'."""

    EXTRACTION_TYPE = "tools"

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self.session_factory = session_factory

    # ── helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def serialize_stageoutput(stageoutput: dict[str, Any] | None) -> str | None:
        return (
            json.dumps(stageoutput, ensure_ascii=True, default=str)
            if stageoutput is not None
            else None
        )

    # ── session lifecycle ──────────────────────────────────────────────────

    def create_session(self, session_id: str, status: Any = None) -> datetime:
        created_at = datetime.utcnow()
        with self.session_factory.begin() as session:
            # Use raw SQL to avoid ORM model dependency
            existing = session.execute(
                text("SELECT id FROM public.sessions WHERE id = :sid"),
                {"sid": session_id},
            ).first()
            status_val = status.value if hasattr(status, "value") else "running"
            if existing is None:
                session.execute(
                    text(
                        "INSERT INTO public.sessions "
                        "(id, content_hash, file_format, file_size_bytes, pipeline_status, created_at) "
                        "VALUES (:sid, :hash, :fmt, :size, :status, :ts)"
                    ),
                    {
                        "sid": session_id,
                        "hash": "",
                        "fmt": "unknown",
                        "size": 0,
                        "status": status_val,
                        "ts": created_at,
                    },
                )
            else:
                session.execute(
                    text(
                        "UPDATE public.sessions "
                        "SET pipeline_status = :status WHERE id = :sid"
                    ),
                    {
                        "status": status_val,
                        "sid": session_id,
                    },
                )
        return created_at

    def update_session_status(self, session_id: str, status: Any) -> None:
        with self.session_factory.begin() as session:
            session.execute(
                text(
                    "UPDATE public.sessions "
                    "SET pipeline_status = :status WHERE id = :sid"
                ),
                {
                    "status": status.value if hasattr(status, "value") else str(status),
                    "sid": session_id,
                },
            )

    # ── stage results (with extraction_type='tools') ──────────────────────

    def write_stage_result(
        self,
        session_id: str,
        stage_name: str,
        stage_number: int,
        status: Any,
        execution_time_ns: int,
        stageoutput: dict[str, Any] | None,
        error_message: str | None,
    ) -> None:
        serialized = self.serialize_stageoutput(stageoutput)
        status_val = status.value if hasattr(status, "value") else str(status)
        execution_ms = round(execution_time_ns / 1_000_000, 2)
        with self.session_factory.begin() as session:
            session.execute(
                text(
                    "INSERT INTO public.stage_results "
                    "  (session_id, stage_number, stage_name, extraction_type, "
                    "   status, execution_time_ms, stageoutput, error_message, created_at) "
                    "VALUES "
                    "  (:sid, :num, :name, :etype, :status, :ms, "
                    "   CAST(:output AS jsonb), :err, NOW()) "
                    "ON CONFLICT (session_id, stage_number) DO UPDATE SET "
                    "  stage_name = EXCLUDED.stage_name, "
                    "  status = EXCLUDED.status, "
                    "  execution_time_ms = EXCLUDED.execution_time_ms, "
                    "  stageoutput = EXCLUDED.stageoutput, "
                    "  error_message = EXCLUDED.error_message, "
                    "  extraction_type = EXCLUDED.extraction_type"
                ),
                {
                    "sid": session_id,
                    "num": stage_number,
                    "name": stage_name,
                    "etype": self.EXTRACTION_TYPE,
                    "status": status_val,
                    "ms": execution_ms,
                    "output": serialized,
                    "err": error_message,
                },
            )

    def write_skipped_stage(
        self,
        session_id: str,
        stage_name: str,
        stage_number: int,
        error_message: str,
    ) -> None:
        self.write_stage_result(
            session_id=session_id,
            stage_name=stage_name,
            stage_number=stage_number,
            status="skipped",
            execution_time_ns=0,
            stageoutput=None,
            error_message=error_message,
        )

    def fail_stage_and_session(
        self,
        session_id: str,
        stage_name: str,
        stage_number: int,
        execution_time_ns: int,
        stageoutput: dict[str, Any] | None,
        error_message: str,
    ) -> None:
        self.write_stage_result(
            session_id, stage_name, stage_number,
            "failed", execution_time_ns, stageoutput, error_message,
        )
        self.update_session_status(session_id, type("S", (), {"value": "failed"})())

    def complete_session(self, session_id: str, has_warnings: bool) -> None:
        final_status = "completed_with_warnings" if has_warnings else "completed"
        with self.session_factory.begin() as session:
            session.execute(
                text(
                    "UPDATE public.sessions "
                    "SET pipeline_status = :status, completed_at = NOW() "
                    "WHERE id = :sid"
                ),
                {"status": final_status, "sid": session_id},
            )
