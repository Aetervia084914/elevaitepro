"""API routes for the certification normalization pipeline."""
from __future__ import annotations

import os

from fastapi import APIRouter, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.responses import ORJSONResponse

from app.schemas.certification import MatchAliasesResponse, ReloadAliasesResponse
from app.services.certification_service import reload_alias_index, run_match_pipeline

router = APIRouter(tags=["certifications"])


@router.post("/match-aliases", response_model=MatchAliasesResponse)
async def match_aliases(
    request: Request,
    file: UploadFile = File(...),
    fuzzy: bool = Query(False, description="Enable Tier 3 RapidFuzz fallback"),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="Minimum match confidence"),
):
    """
    POST /match-aliases

    Upload a resume (PDF/DOCX/TXT) and get matched certification aliases.
    """
    file_data = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type

    try:
        response_dict = await run_match_pipeline(
            request=request,
            file_data=file_data,
            filename=filename,
            content_type=content_type,
            fuzzy=fuzzy,
            min_confidence=min_confidence,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ORJSONResponse(response_dict)


@router.post("/reload-aliases", response_model=ReloadAliasesResponse)
async def reload_aliases(
    request: Request,
    x_admin_key: str = Header(...),
):
    """
    POST /reload-aliases

    Re-fetch aliases from DB and rebuild automaton.
    Requires X-Admin-Key header.
    """
    expected_key = os.getenv("ADMIN_KEY", "admin-secret")
    if x_admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")

    result = await reload_alias_index(request.app.state)
    return ReloadAliasesResponse(
        status="ok",
        alias_count=result["alias_count"],
        rebuild_ms=result["rebuild_ms"],
    )
