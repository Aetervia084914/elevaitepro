"""Cache-first role analysis retrieval — Redis removed, PostgreSQL only.

Lookup priority (strict order):
    1. PostgreSQL → role_analyses table                 → source = "postgres_cache"
    2. OpenAI → expensive LLM call (delegates to /GetAnalysis) → source = "openai_generated"

POST /role-analysis           — retrieve (or generate) role analysis
POST /role-analysis/invalidate — delete cached analysis for a candidate+role+region
"""
from __future__ import annotations

import json
import logging
import re
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from app.core.async_db import get_async_pool
from app.utils.cache_keys import (
    normalise_role_key,
    normalise_region_key,
    role_analysis_redis_key,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["role-analysis"])


# ── Internal: resolve candidate_id from session_token ─────────────────────────

def _resolve_candidate_id(session_token: str) -> uuid.UUID | None:
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            row = db.execute(
                text("SELECT user_id FROM usersession WHERE session_token = :token"),
                {"token": session_token},
            ).fetchone()
            return row[0] if row else None
    except Exception as exc:
        logger.warning("role_analysis: cannot resolve candidate_id — %s", exc)
        return None


# ── Request / Response schemas ────────────────────────────────────────────────

class RoleAnalysisRequest(BaseModel):
    candidate_id: uuid.UUID | None = None
    target_role: str
    region: str = "United Kingdom"
    force_refresh: bool = False
    why_suggested: str = ""


class RoleAnalysisResponse(BaseModel):
    success: bool = True
    source: str
    candidate_id: uuid.UUID
    target_role: str
    region: str
    analysis: dict[str, Any]


class InvalidateRequest(BaseModel):
    candidate_id: uuid.UUID | None = None
    target_role: str
    region: str = "United Kingdom"


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _resolve_journey_id(candidate_id: uuid.UUID, conn) -> str | None:
    try:
        cur = await conn.execute(
            "SELECT id FROM userjourney WHERE user_id = %s LIMIT 1",
            (str(candidate_id),),
        )
        row = await cur.fetchone()
        return str(row[0]) if row else None
    except Exception as exc:
        logger.warning("role_analysis: cannot resolve journey_id for candidate %s — %s", candidate_id, exc)
        return None


async def upsert_suggested_roles(
    candidate_id: uuid.UUID,
    roles: list[str],
    why_suggested: dict[str, str],
    confidence_scores: dict[str, float],
    inferred_seniority: str,
    region: str,
) -> None:
    if not roles:
        return
    try:
        pool = get_async_pool()
        async with pool.connection() as conn:
            journey_id = await _resolve_journey_id(candidate_id, conn)
            for role in roles:
                analysis = {
                    "inferred_seniority": inferred_seniority,
                    "confidence_score": confidence_scores.get(role, 0.0),
                    "why_suggested": why_suggested.get(role, ""),
                    "source": "future_roles_api",
                }
                await conn.execute(
                    """
                    INSERT INTO role_analyses
                        (candidate_id, target_role, region, analysis, why_suggested, user_journey_id, analysis_status)
                    VALUES (%s, %s, %s, %s::jsonb, %s, %s, 'suggested')
                    ON CONFLICT ON CONSTRAINT uq_role_analyses_candidate_role_region
                    DO NOTHING
                    """,
                    (
                        str(candidate_id), role, region,
                        json.dumps(analysis, default=str),
                        why_suggested.get(role, ""),
                        journey_id,
                    ),
                )
            await conn.commit()
        logger.info("upsert_suggested_roles — candidate=%s roles=%d", candidate_id, len(roles))
    except Exception as exc:
        logger.warning("upsert_suggested_roles failed — candidate=%s: %s", candidate_id, exc)


async def _upsert_postgres(
    candidate_id: uuid.UUID, target_role: str, region: str, analysis: dict,
    why_suggested: str = "",
) -> bool:
    try:
        pool = get_async_pool()
        async with pool.connection() as conn:
            journey_id = await _resolve_journey_id(candidate_id, conn)
            await conn.execute(
                """
                INSERT INTO role_analyses
                    (candidate_id, target_role, region, analysis, why_suggested, user_journey_id, analysis_status)
                VALUES (%s, %s, %s, %s::jsonb, %s, %s, 'completed')
                ON CONFLICT ON CONSTRAINT uq_role_analyses_candidate_role_region
                DO UPDATE SET analysis        = EXCLUDED.analysis,
                              why_suggested   = EXCLUDED.why_suggested,
                              user_journey_id = COALESCE(EXCLUDED.user_journey_id, role_analyses.user_journey_id),
                              analysis_status = 'completed',
                              updated_at      = now()
                """,
                (str(candidate_id), target_role, region, json.dumps(analysis, default=str),
                 why_suggested or "", journey_id),
            )
            await conn.commit()
        logger.info("role_analyses UPSERT — candidate=%s role=%s region=%s journey_id=%s",
                    candidate_id, target_role, region, journey_id)
        return True
    except Exception as exc:
        logger.warning("role_analyses UPSERT failed — %s: %s", target_role, exc)
        return False


async def _read_postgres(
    candidate_id: uuid.UUID, target_role: str, region: str
) -> dict | None:
    try:
        pool = get_async_pool()
        async with pool.connection() as conn:
            cur = await conn.execute(
                """
                SELECT analysis FROM role_analyses
                WHERE candidate_id = %s AND target_role = %s AND region = %s
                """,
                (str(candidate_id), target_role, region),
            )
            row = await cur.fetchone()
            if row and row[0]:
                analysis = row[0]
                if isinstance(analysis, str):
                    return json.loads(analysis)
                return analysis
    except Exception as exc:
        logger.warning("role_analyses SELECT failed — %s: %s", target_role, exc)
    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/role-analysis", response_model=RoleAnalysisResponse)
async def get_role_analysis(
    req: RoleAnalysisRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> RoleAnalysisResponse:
    """Cache-first role analysis retrieval with PostgreSQL + LLM fallback."""

    session_token = x_session_id
    role = req.target_role.strip()
    region = req.region.strip() or "United Kingdom"
    why_suggested = req.why_suggested.strip()

    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_role is required")

    cid = req.candidate_id
    if cid is None and session_token:
        cid = _resolve_candidate_id(session_token)
    if cid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="candidate_id could not be resolved — provide candidate_id in body or x-session-id header",
        )

    # Step 1 — PostgreSQL cache
    if not req.force_refresh:
        pg_data = await _read_postgres(cid, role, region)
        if pg_data:
            logger.info("[role-analysis] HIT postgres_cache — candidate=%s role=%s", cid, role)
            return RoleAnalysisResponse(
                source="postgres_cache",
                candidate_id=cid,
                target_role=role,
                region=region,
                analysis=pg_data,
            )

    # Step 2 — delegate to existing /GetAnalysis endpoint (OpenAI call)
    from app.api.routes.get_analysis import (
        AnalysisRequest,
        SuggestedRole,
        get_analysis,
    )

    try:
        llm_req = AnalysisRequest(
            suggestedFutureRoles=[SuggestedRole(role=role, whySuggested=why_suggested)],
            region=region,
        )
        llm_resp = await get_analysis(llm_req, x_session_id=session_token)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[role-analysis] OpenAI generation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI generation failed: {exc}",
        ) from exc

    if not llm_resp.roleAnalyses:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned no role analyses",
        )

    role_analysis = llm_resp.roleAnalyses[0]

    # Persist to PostgreSQL
    await _upsert_postgres(cid, role, region, role_analysis, why_suggested)

    logger.info("[role-analysis] openai_generated — candidate=%s role=%s", cid, role)
    return RoleAnalysisResponse(
        source="openai_generated",
        candidate_id=cid,
        target_role=role,
        region=region,
        analysis=role_analysis,
    )


@router.post("/role-analysis/invalidate")
async def invalidate_role_analysis(
    req: InvalidateRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Delete cached role analysis from PostgreSQL."""
    cid = req.candidate_id
    if cid is None and x_session_id:
        cid = _resolve_candidate_id(x_session_id)
    if cid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="candidate_id could not be resolved",
        )
    role = req.target_role.strip()
    region = req.region.strip() or "United Kingdom"

    pg_deleted = False

    try:
        pool = get_async_pool()
        async with pool.connection() as conn:
            cur = await conn.execute(
                """
                DELETE FROM role_analyses
                WHERE candidate_id = %s AND target_role = %s AND region = %s
                """,
                (str(cid), role, region),
            )
            pg_deleted = cur.rowcount > 0
            await conn.commit()
    except Exception as exc:
        logger.warning("invalidate PG DELETE failed — %s: %s", role, exc)

    return {
        "success": pg_deleted,
        "postgres_deleted": pg_deleted,
        "candidate_id": str(cid),
        "target_role": role,
        "region": region,
    }
