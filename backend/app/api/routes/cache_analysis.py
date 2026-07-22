"""Lightweight endpoint for the Next.js getanalysis route to push
per-role analysis results into the RedisJSON candidate cache.

POST /cache-analysis-role
    Headers:  x-session-id: <session_token>
    Body:     { "roleName": "...", "roleData": { ... } }
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.candidate_cache import cache_analysis_role

router = APIRouter(tags=["candidate-cache"])


class CacheAnalysisRoleRequest(BaseModel):
    roleName: str
    roleData: dict[str, Any]


@router.post("/cache-analysis-role")
def post_cache_analysis_role(
    body: CacheAnalysisRoleRequest,
    x_session_id: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="x-session-id header is required")
    if not body.roleName.strip():
        raise HTTPException(status_code=400, detail="roleName is required")

    ok = cache_analysis_role(x_session_id, body.roleName, body.roleData)
    return {"cached": ok, "role": body.roleName}
