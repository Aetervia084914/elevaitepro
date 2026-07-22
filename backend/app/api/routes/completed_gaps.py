"""Persistent completion tracking for Dashboard Analysis learning items.

Stores per-CV, per-role completion state in the usercompletedgaps table,
mapped User -> Candidate -> Uploaded CV.

  POST /save-completed-gap      → upsert one item's completion (check / uncheck)
  POST /delete-completed-gap    → delete one item's completion record
  GET  /get-completed-gaps      → all completed items for the candidate's latest CV + role

Ownership is resolved server-side from the x-session-id header; client-supplied
candidateId is validated (never trusted) and must match the session owner.
"""
from __future__ import annotations

import logging
import time
from typing import Annotated, Any

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.async_db import get_async_conn

logger = logging.getLogger(__name__)

router = APIRouter(tags=["completed-gaps"])

_VALID_ITEM_TYPES = {"SkillGap", "AISkill", "Competency", "Certification", "CertificationStep"}


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _resolve_owner(conn, session_token: str | None, candidate_id: str | None) -> str | None:
    """Return the authoritative candidate/user id for the session token.

    Returns None if the session is missing/expired (caller → 401). Raises
    _OwnershipError if a client-supplied candidate_id does not match the session.
    """
    if not session_token:
        return None

    now = int(time.time())
    cur = await conn.execute(
        "SELECT user_id FROM usersession WHERE session_token = %s AND expires_at > %s",
        (session_token, now),
    )
    row = await cur.fetchone()
    if not row:
        return None

    owner_id = str(row[0])
    if candidate_id and str(candidate_id) != owner_id:
        raise _OwnershipError()
    return owner_id


async def _latest_cv_upload_id(conn, candidate_id: str) -> str | None:
    """Most recent uploaded CV for this candidate (the one currently analysed)."""
    cur = await conn.execute(
        """SELECT id FROM user_cv_upload
           WHERE candidate_id = %s
           ORDER BY created_at DESC
           LIMIT 1""",
        (candidate_id,),
    )
    row = await cur.fetchone()
    return str(row[0]) if row else None


class _OwnershipError(Exception):
    """Raised when a client-supplied id does not belong to the session owner."""


# ── POST /save-completed-gap ─────────────────────────────────────────────────

class SaveCompletedGapRequest(BaseModel):
    candidateId: str = ""
    itemType: str = ""
    itemId: str = ""
    itemTitle: str = ""
    targetRole: str = ""
    region: str = ""
    isCompleted: bool = True


@router.post("/save-completed-gap")
async def save_completed_gap(
    body: SaveCompletedGapRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    if not body.itemType or not body.itemId:
        return JSONResponse(status_code=400, content={"success": False, "error": "Missing itemType or itemId"})
    if body.itemType not in _VALID_ITEM_TYPES:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid itemType: {body.itemType}"})

    try:
        async with get_async_conn() as conn:
            try:
                owner_id = await _resolve_owner(conn, x_session_id, body.candidateId)
            except _OwnershipError:
                return JSONResponse(status_code=403, content={"success": False, "error": "Forbidden"})
            if not owner_id:
                return JSONResponse(status_code=401, content={"success": False, "error": "No valid session"})

            cv_upload_id = await _latest_cv_upload_id(conn, owner_id)
            if not cv_upload_id:
                return JSONResponse(status_code=400, content={"success": False, "error": "No uploaded CV found for this candidate"})

            await conn.execute(
                """INSERT INTO usercompletedgaps
                     (user_id, candidate_id, user_cv_upload_id, target_role, region,
                      item_type, item_id, item_title, is_completed, completed_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                           CASE WHEN %s THEN now() ELSE NULL END)
                   ON CONFLICT ON CONSTRAINT uq_usercompletedgaps
                   DO UPDATE SET
                     is_completed = EXCLUDED.is_completed,
                     item_title   = EXCLUDED.item_title,
                     region       = EXCLUDED.region,
                     completed_at = CASE WHEN EXCLUDED.is_completed THEN now() ELSE NULL END,
                     updated_at   = now()""",
                (
                    owner_id, owner_id, cv_upload_id, body.targetRole or "", body.region or "",
                    body.itemType, body.itemId, body.itemTitle or "", body.isCompleted,
                    body.isCompleted,
                ),
            )
            await conn.commit()

        return {"success": True, "isCompleted": body.isCompleted, "userCvUploadId": cv_upload_id}
    except Exception as exc:
        logger.error("[save-completed-gap] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── POST /delete-completed-gap ────────────────────────────────────────────────

class DeleteCompletedGapRequest(BaseModel):
    candidateId: str = ""
    itemType: str = ""
    itemId: str = ""
    targetRole: str = ""


@router.post("/delete-completed-gap")
async def delete_completed_gap(
    body: DeleteCompletedGapRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Delete a completed gap record when user unchecks the radio button."""
    if not body.itemType or not body.itemId:
        return JSONResponse(status_code=400, content={"success": False, "error": "Missing itemType or itemId"})
    if body.itemType not in _VALID_ITEM_TYPES:
        return JSONResponse(status_code=400, content={"success": False, "error": f"Invalid itemType: {body.itemType}"})

    try:
        async with get_async_conn() as conn:
            try:
                owner_id = await _resolve_owner(conn, x_session_id, body.candidateId)
            except _OwnershipError:
                return JSONResponse(status_code=403, content={"success": False, "error": "Forbidden"})
            if not owner_id:
                return JSONResponse(status_code=401, content={"success": False, "error": "No valid session"})

            cv_upload_id = await _latest_cv_upload_id(conn, owner_id)
            if not cv_upload_id:
                return JSONResponse(status_code=400, content={"success": False, "error": "No uploaded CV found for this candidate"})

            # Delete the record from usercompletedgaps
            await conn.execute(
                """DELETE FROM usercompletedgaps
                   WHERE user_id = %s
                     AND user_cv_upload_id = %s
                     AND target_role = %s
                     AND item_type = %s
                     AND item_id = %s""",
                (owner_id, cv_upload_id, body.targetRole or "", body.itemType, body.itemId),
            )
            await conn.commit()

        logger.info("[delete-completed-gap] Deleted %s:%s for candidate %s role %s", 
                    body.itemType, body.itemId, owner_id, body.targetRole)
        return {"success": True, "deleted": True}
    except Exception as exc:
        logger.error("[delete-completed-gap] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


# ── GET /get-completed-gaps ──────────────────────────────────────────────────

@router.get("/get-completed-gaps")
async def get_completed_gaps(
    candidateId: str = Query(default=""),
    targetRole: str = Query(default=""),
    region: str = Query(default=""),
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    try:
        async with get_async_conn() as conn:
            try:
                owner_id = await _resolve_owner(conn, x_session_id, candidateId)
            except _OwnershipError:
                return JSONResponse(status_code=403, content={"success": False, "error": "Forbidden"})
            if not owner_id:
                return JSONResponse(status_code=401, content={"success": False, "error": "No valid session"})

            cv_upload_id = await _latest_cv_upload_id(conn, owner_id)
            if not cv_upload_id:
                # No CV yet — nothing completed. Not an error.
                return {"success": True, "completed": [], "userCvUploadId": None}

            cur = await conn.execute(
                """SELECT item_type, item_id
                   FROM usercompletedgaps
                   WHERE user_cv_upload_id = %s
                     AND target_role = %s
                     AND is_completed = TRUE""",
                (cv_upload_id, targetRole or ""),
            )
            rows = await cur.fetchall()

        completed = [{"itemType": r[0], "itemId": r[1]} for r in rows]
        return {"success": True, "completed": completed, "userCvUploadId": cv_upload_id}
    except Exception as exc:
        logger.error("[get-completed-gaps] Error: %s", exc)
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
