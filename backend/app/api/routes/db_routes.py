"""Migrated Next.js DB routes → FastAPI async endpoints.

Replaces these Next.js API routes that used lib/db.js:
  GET  /get-latest-analysis
  POST /save-api-response
  POST /save-future-roles
  GET  /get-journey
  GET  /get-candidate-roles
  POST /init-journey
  POST /get-cached-analysis
"""
from __future__ import annotations

import json
import logging
import time
from typing import Annotated, Any

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.async_db import get_async_conn
from app.core.api_timing import record_api_time

logger = logging.getLogger(__name__)

router = APIRouter(tags=["db-routes"])


# ── GET /get-latest-analysis ─────────────────────────────────────────────────

@router.get("/get-latest-analysis")
async def get_latest_analysis(candidateId: str = Query(default="")) -> dict[str, Any]:
    if not candidateId:
        return JSONResponse(status_code=400, content={"success": False, "error": "Missing candidateId"})

    try:
        async with get_async_conn() as conn:
            cur = await conn.execute(
                """SELECT target_role, region, analysis, why_suggested
                   FROM role_analyses
                   WHERE candidate_id = %s
                   ORDER BY updated_at DESC
                   LIMIT 1""",
                (candidateId,),
            )
            row = await cur.fetchone()

        if not row:
            return {"success": True, "analysis": None}

        return {
            "success": True,
            "targetRole": row[0],
            "region": row[1],
            "analysis": row[2],
            "whySuggested": row[3],
        }
    except Exception as exc:
        logger.error("[get-latest-analysis] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── POST /save-api-response ──────────────────────────────────────────────────

class SaveApiResponseRequest(BaseModel):
    candidateId: str = ""
    cvData: Any = None
    targetRole: str = ""
    region: str = ""
    analysis: Any = None
    whySuggested: str = ""
    triggeredFrom: str = "sidebar"


@router.post("/save-api-response")
async def save_api_response(body: SaveApiResponseRequest) -> dict[str, Any]:
    t0 = time.time()
    try:
        if body.cvData and not body.targetRole:
            logger.info("[save-api-response] CV data received for candidate %s", body.candidateId)
            await record_api_time("/api/save-api-response", (time.time() - t0) * 1000)
            return {"success": True}

        if not body.candidateId or not body.targetRole or body.analysis is None:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing required fields: candidateId, targetRole, analysis"},
            )

        analysis_region = body.region or "United Kingdom"
        analysis_json = json.dumps(body.analysis, default=str)

        async with get_async_conn() as conn:
            cur = await conn.execute(
                """INSERT INTO role_analyses
                     (candidate_id, target_role, region, analysis, why_suggested)
                   VALUES (%s, %s, %s, %s::jsonb, %s)
                   ON CONFLICT ON CONSTRAINT uq_role_analyses_candidate_role_region
                   DO UPDATE SET
                     analysis      = EXCLUDED.analysis,
                     why_suggested = EXCLUDED.why_suggested,
                     updated_at    = now()
                   RETURNING id""",
                (body.candidateId, body.targetRole, analysis_region, analysis_json, body.whySuggested or ""),
            )
            ra_row = await cur.fetchone()
            role_analysis_id = ra_row[0] if ra_row else None

            user_journey_id = None
            try:
                j_cur = await conn.execute(
                    "SELECT id FROM userjourney WHERE user_id = %s LIMIT 1",
                    (body.candidateId,),
                )
                j_row = await j_cur.fetchone()
                user_journey_id = j_row[0] if j_row else None
            except Exception as j_err:
                logger.warning("[save-api-response] Could not fetch user_journey_id: %s", j_err)

            try:
                await conn.execute(
                    """INSERT INTO useranalysis
                         (candidate_id, user_journey_id, role_analysis_id, target_role, region, analysis_response, triggered_from)
                       VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                       ON CONFLICT ON CONSTRAINT uq_useranalysis_journey_role_region
                       DO UPDATE SET
                         analysis_response = EXCLUDED.analysis_response,
                         updated_at        = now()""",
                    (body.candidateId, user_journey_id, role_analysis_id, body.targetRole, analysis_region, analysis_json, body.triggeredFrom),
                )
                logger.info(
                    "[save-api-response] UserAnalysis saved for candidate %s, role %s, triggered from %s",
                    body.candidateId, body.targetRole, body.triggeredFrom,
                )
            except Exception as ua_err:
                logger.warning("[save-api-response] Failed to save useranalysis: %s", ua_err)

            await conn.commit()

        await record_api_time("/api/save-api-response", (time.time() - t0) * 1000)
        return {"success": True}
    except Exception as exc:
        await record_api_time("/api/save-api-response", (time.time() - t0) * 1000, "error")
        logger.error("[save-api-response] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── POST /save-future-roles ──────────────────────────────────────────────────

class SaveFutureRolesRequest(BaseModel):
    candidateId: str = ""
    roles: list[str] = []
    location: str = ""
    whySuggested: dict[str, str] | None = None
    confidenceScores: dict[str, float] | None = None


@router.post("/save-future-roles")
async def save_future_roles(body: SaveFutureRolesRequest) -> dict[str, Any]:
    if not body.candidateId or not body.roles:
        return JSONResponse(status_code=400, content={"success": False, "error": "Missing candidateId or roles"})

    try:
        async with get_async_conn() as conn:
            journey_cur = await conn.execute(
                "SELECT id FROM userjourney WHERE user_id = %s LIMIT 1",
                (body.candidateId,),
            )
            j_row = await journey_cur.fetchone()
            _user_journey_id = j_row[0] if j_row else None

            inserted = 0
            for role in body.roles:
                try:
                    await conn.execute(
                        """INSERT INTO role_analyses
                             (candidate_id, target_role, region, analysis, why_suggested)
                           VALUES (%s, %s, %s, %s::jsonb, %s)
                           ON CONFLICT ON CONSTRAINT uq_role_analyses_candidate_role_region
                           DO UPDATE SET
                             why_suggested = EXCLUDED.why_suggested,
                             updated_at = now()""",
                        (
                            body.candidateId,
                            role,
                            body.location or "United Kingdom",
                            json.dumps({}),
                            (body.whySuggested or {}).get(role, ""),
                        ),
                    )
                    inserted += 1
                    logger.info('[save-future-roles] Inserted role "%s" for candidate %s', role, body.candidateId)
                except Exception as role_err:
                    logger.warning('[save-future-roles] Failed to insert role "%s": %s', role, role_err)

            try:
                await conn.execute(
                    """
                    UPDATE user_cv_upload
                       SET future_roles_data = COALESCE(future_roles_data, '{}'::jsonb) || %s::jsonb,
                           updated_at = now()
                     WHERE candidate_id = %s
                       AND id = (
                           SELECT id
                             FROM user_cv_upload
                            WHERE candidate_id = %s
                            ORDER BY created_at DESC
                            LIMIT 1
                       )
                    """,
                    (
                        json.dumps(
                            {
                                "roles": body.roles,
                                "location": body.location or "United Kingdom",
                                "why_suggested": body.whySuggested or {},
                                "confidence_scores": body.confidenceScores or {},
                            }
                        ),
                        body.candidateId,
                        body.candidateId,
                    ),
                )
            except Exception as cv_upload_err:
                logger.warning("[save-future-roles] Failed to update user_cv_upload for candidate %s: %s", body.candidateId, cv_upload_err)

            await conn.commit()

        return {
            "success": True,
            "inserted": inserted,
            "total": len(body.roles),
            "message": f"Saved {inserted}/{len(body.roles)} future roles to database",
        }
    except Exception as exc:
        logger.error("[save-future-roles] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── GET /get-journey ─────────────────────────────────────────────────────────

@router.get("/get-journey")
async def get_journey(candidateId: str = Query(default="")) -> dict[str, Any]:
    if not candidateId:
        return JSONResponse(status_code=400, content={"error": "Missing candidateId parameter"})

    try:
        async with get_async_conn() as conn:
            cur = await conn.execute(
                "SELECT * FROM userjourney WHERE user_id = %s",
                (candidateId,),
            )
            row = await cur.fetchone()

            if not row:
                return JSONResponse(status_code=404, content={"error": "Journey not found for this candidate"})

            columns = [desc.name for desc in cur.description] if cur.description else []
            journey = dict(zip(columns, row)) if columns else {}

        return {
            "success": True,
            "journey": journey,
            "creditsRemaining": journey.get("credits_remaining", 0),
        }
    except Exception as exc:
        logger.error("[get-journey] Error: %s", exc)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch journey data"})


# ── GET /get-candidate-roles ─────────────────────────────────────────────────

@router.get("/get-candidate-roles")
async def get_candidate_roles(candidateId: str = Query(default="")) -> dict[str, Any]:
    if not candidateId:
        return JSONResponse(status_code=400, content={"error": "Missing candidateId parameter"})

    try:
        async with get_async_conn() as conn:
            cur = await conn.execute(
                """
                SELECT
                  ur.location AS region,
                  roles.role AS target_role,
                  COALESCE(ur.future_roles_data->'why_suggested'->>roles.role, '') AS why_suggested
                FROM (
                  SELECT location, future_roles_data
                  FROM user_cv_upload
                  WHERE candidate_id = %s
                    AND future_roles_data IS NOT NULL
                    AND jsonb_typeof(COALESCE(future_roles_data->'roles', future_roles_data->'all_plausible_future_roles')) = 'array'
                  ORDER BY created_at DESC
                  LIMIT 1
                ) AS ur,
                LATERAL jsonb_array_elements_text(
                  COALESCE(
                    ur.future_roles_data->'roles',
                    ur.future_roles_data->'all_plausible_future_roles'
                  )
                ) AS roles(role)
                """,
                (candidateId,),
            )
            rows = await cur.fetchall()

        roles = [
            {"target_role": r[1], "region": r[0] or '', "why_suggested": r[2]}
            for r in rows
        ]

        return {"success": True, "roles": roles}
    except Exception as exc:
        logger.error("[get-candidate-roles] Error: %s", exc)
        return JSONResponse(status_code=500, content={"error": "Failed to fetch candidate roles"})


# ── POST /init-journey ───────────────────────────────────────────────────────

class InitJourneyRequest(BaseModel):
    candidateId: str
    currentStage: str = "UPLOAD_CV"
    creditsRemaining: int = 1


@router.post("/init-journey")
async def init_journey(body: InitJourneyRequest) -> dict[str, Any]:
    if not body.candidateId:
        return JSONResponse(status_code=400, content={"error": "Missing candidateId"})

    try:
        async with get_async_conn() as conn:
            ins_cur = await conn.execute(
                """INSERT INTO userjourney (user_id, current_stage, credits_remaining)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (user_id) DO UPDATE
                     SET current_stage = userjourney.current_stage
                   RETURNING *, (xmax = 0) AS was_inserted""",
                (body.candidateId, body.currentStage, body.creditsRemaining),
            )
            row = await ins_cur.fetchone()
            await conn.commit()

            if not row:
                raise Exception("Failed to create/fetch userjourney")

            columns = [desc.name for desc in ins_cur.description] if ins_cur.description else []
            journey = dict(zip(columns, row)) if columns else {}
            created = journey.pop("was_inserted", True)

        if created:
            logger.info("[init-journey] Created new userjourney for candidate %s", body.candidateId)
        else:
            logger.info("[init-journey] Returning existing userjourney for candidate %s", body.candidateId)
        return {
            "success": True,
            "journey": journey,
            "creditsRemaining": journey.get("credits_remaining", 1),
            "created": created,
        }
    except Exception as exc:
        logger.error("[init-journey] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── POST /get-cached-analysis ────────────────────────────────────────────────

class GetCachedAnalysisRequest(BaseModel):
    candidateId: str = ""
    targetRole: str = ""
    region: str = "United Kingdom"


@router.post("/get-cached-analysis")
async def get_cached_analysis(body: GetCachedAnalysisRequest) -> dict[str, Any]:
    if not body.candidateId or not body.targetRole:
        return JSONResponse(status_code=400, content={"error": "Missing required fields: candidateId, targetRole"})

    try:
        async with get_async_conn() as conn:
            cur = await conn.execute(
                """SELECT
                    id,
                    analysis_response,
                    created_at,
                    triggered_from
                   FROM useranalysis
                   WHERE candidate_id = %s
                     AND target_role = %s
                     AND region = %s
                     AND status = 'completed'
                   ORDER BY created_at DESC
                   LIMIT 1""",
                (body.candidateId, body.targetRole, body.region),
            )
            row = await cur.fetchone()

        if row:
            logger.info(
                "[get-cached-analysis] Cache HIT for candidate %s, role %s, region %s",
                body.candidateId, body.targetRole, body.region,
            )
            # ✅ TIMELINE DEBUG: Log careerRoadmap extraction
            analysis_data = row[1] or {}
            career_roadmap = analysis_data.get('careerRoadmap') if isinstance(analysis_data, dict) else None
            logger.info(
                "[get-cached-analysis] TIMELINE DEBUG - Has careerRoadmap: %s, Keys in response: %s",
                bool(career_roadmap),
                list(analysis_data.keys()) if isinstance(analysis_data, dict) else "not a dict"
            )
            return {
                "success": True,
                "cached": True,
                "data": row[1],
                "metadata": {
                    "cacheId": row[0],
                    "createdAt": row[2],
                    "triggeredFrom": row[3],
                },
            }

        logger.info(
            "[get-cached-analysis] Cache MISS for candidate %s, role %s, region %s",
            body.candidateId, body.targetRole, body.region,
        )
        return {"success": True, "cached": False, "data": None}
    except Exception as exc:
        logger.error("[get-cached-analysis] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── GET /auth-me ─────────────────────────────────────────────────────────────

@router.get("/auth-me")
async def auth_me(
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    session_token = x_session_id
    if not session_token:
        return JSONResponse(status_code=401, content={"error": "No session."})

    try:
        now = int(time.time())

        async with get_async_conn() as conn:
            s_cur = await conn.execute(
                "SELECT user_id FROM usersession WHERE session_token = %s AND expires_at > %s",
                (session_token, now),
            )
            s_row = await s_cur.fetchone()

            if not s_row:
                return JSONResponse(status_code=401, content={"error": "Session expired."})

            user_id = s_row[0]

            u_cur = await conn.execute(
                """SELECT
                     c.id,
                     c.name,
                     c.contact          AS email,
                     c.selected_tier,
                     c.career_aspirations,
                     c.cv_attempts_used,
                     c.last_payment_date,
                     c.created_at,
                     uj.current_stage,
                     uj.credits_remaining
                   FROM candidates c
                   LEFT JOIN userjourney uj ON uj.user_id = c.id
                   WHERE c.id = %s""",
                (str(user_id),),
            )
            u_row = await u_cur.fetchone()

        if not u_row:
            return JSONResponse(status_code=404, content={"error": "User not found."})

        return {
            "user": {
                "id": u_row[0],
                "name": u_row[1],
                "email": u_row[2],
                "selectedTier": u_row[3],
                "selected_tier": u_row[3],
                "careerAspirations": u_row[4],
                "career_aspirations": u_row[4],
                "cvAttemptsUsed": u_row[5],
                "lastPaymentDate": u_row[6],
                "currentStage": u_row[8] or "UPLOAD_CV",
                "creditsRemaining": u_row[9] if u_row[9] is not None else 1,
                "createdAt": u_row[7],
            },
            "sessionId": session_token,
        }
    except Exception as exc:
        logger.error("[auth/me] Error: %s", exc)
        return JSONResponse(status_code=500, content={"error": "Server error."})


# ── POST /advance-journey-next ───────────────────────────────────────────────

STAGE_MAP = {
    "UPLOAD_CV": "ANALYSIS",
    "ANALYSIS": "RESULTS",
    "RESULTS": "RESULTS",
}


class AdvanceJourneyNextRequest(BaseModel):
    candidateId: str


@router.post("/advance-journey-next")
async def advance_journey_next(body: AdvanceJourneyNextRequest) -> dict[str, Any]:
    if not body.candidateId:
        return JSONResponse(status_code=400, content={"error": "Missing candidateId"})

    try:
        async with get_async_conn() as conn:
            cur = await conn.execute(
                "SELECT * FROM userjourney WHERE user_id = %s",
                (body.candidateId,),
            )
            row = await cur.fetchone()
            columns = [desc.name for desc in cur.description] if cur.description else []

            if not row:
                logger.warning("[advance-journey] No journey found for candidate %s, creating one", body.candidateId)
                ins_cur = await conn.execute(
                    """INSERT INTO userjourney (user_id, current_stage, credits_remaining)
                       VALUES (%s, 'UPLOAD_CV', 1)
                       RETURNING *""",
                    (body.candidateId,),
                )
                row = await ins_cur.fetchone()
                columns = [desc.name for desc in ins_cur.description] if ins_cur.description else []
                await conn.commit()

            current_journey = dict(zip(columns, row)) if columns else {}
            current_stage = current_journey.get("current_stage", "UPLOAD_CV")
            next_stage = STAGE_MAP.get(current_stage, current_stage)

            credits_to_set = 0 if next_stage == "ANALYSIS" else current_journey.get("credits_remaining", 1)

            upd_cur = await conn.execute(
                """UPDATE userjourney
                   SET current_stage = %s,
                       credits_remaining = %s,
                       updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
                   WHERE user_id = %s
                   RETURNING *""",
                (next_stage, credits_to_set, body.candidateId),
            )
            upd_row = await upd_cur.fetchone()
            upd_columns = [desc.name for desc in upd_cur.description] if upd_cur.description else []
            await conn.commit()

        updated_journey = dict(zip(upd_columns, upd_row)) if upd_columns and upd_row else {}
        logger.info(
            "[advance-journey] Advanced candidate %s from %s to %s%s",
            body.candidateId, current_stage, next_stage,
            " (credits set to 0)" if next_stage == "ANALYSIS" else "",
        )

        return {
            "success": True,
            "message": f"Journey advanced to {next_stage}",
            "currentStage": next_stage,
            "journey": updated_journey,
            "creditsRemaining": updated_journey.get("credits_remaining", 1),
        }
    except Exception as exc:
        logger.error("[advance-journey] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
