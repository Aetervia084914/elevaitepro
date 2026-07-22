"""Read-only endpoint for the candidate RedisJSON cache.

GET /candidate-cache                → full document
GET /candidate-cache?path=$.Analysis              → all analyses
GET /candidate-cache?path=$.Analysis.3D_Tutor     → single role
GET /candidate-cache?roles_only=true              → list of analysed role keys
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Header, HTTPException, Query

from app.core.candidate_cache import get_analysed_roles, get_candidate_cache

router = APIRouter(tags=["candidate-cache"])


@router.get("/candidate-cache")
def read_candidate_cache(
    x_session_id: Annotated[str | None, Header()] = None,
    path: str = Query(default="$", description="RedisJSON path, e.g. $.Analysis"),
    roles_only: bool = Query(default=False, description="Return only the list of analysed role keys"),
) -> dict[str, Any]:
    """Return the candidate RedisJSON cache (or a sub-path of it)."""
    if not x_session_id:
        raise HTTPException(status_code=400, detail="x-session-id header is required")

    if roles_only:
        keys = get_analysed_roles(x_session_id)
        if keys is None:
            raise HTTPException(status_code=404, detail="No cache found for this session")
        return {"analysed_roles": keys}

    data = get_candidate_cache(x_session_id, path)
    if data is None:
        raise HTTPException(status_code=404, detail="No cache found for this session")

    return {"path": path, "data": data}
