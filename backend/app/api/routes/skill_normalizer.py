"""API routes for the skill normalizer pipeline."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.responses import ORJSONResponse

from app.core.async_db import get_async_conn
from app.schemas.skill_normalizer import ExtractSkillsResponse
from app.services.skill_normalizer.redis_cache import get_redis
from app.services.skill_normalizer.pipeline import run_extract_skills_pipeline

router = APIRouter(tags=["skill-normalizer"])


@router.post(
    "/extract-skills",
    response_model=ExtractSkillsResponse,
    summary="Extract skills from an uploaded document",
    responses={
        400: {"description": "Invalid file or unsupported language"},
        413: {"description": "File too large (> 10 MB)"},
        422: {"description": "Text extraction failed"},
    },
)
async def extract_skills(
    file: UploadFile,
    request: Request,
    redis_client=Depends(get_redis),
):
    """
    Upload a resume/document and extract canonical skill names.

    **Accepted formats:** .docx, .pdf, .doc, .odt, .ods, .txt (max 10 MB)

    **Pipeline:** Stage 1 (ingest) -> 2 (extract) -> 3A (exact) -> 3B (phrase)
    -> 3C (semantic) -> 4 (score) -> 5 (LLM fallback, conditional) -> 6 (persist)
    -> 7 (profile)
    """
    async with get_async_conn() as conn:
        return await run_extract_skills_pipeline(
            file=file,
            request=request,
            conn=conn,
            redis_client=redis_client,
        )


@router.get("/skill-health")
async def skill_health():
    """Basic health check for the skill normalizer pipeline — verifies DB connectivity."""
    async with get_async_conn() as conn:
        await conn.execute("SELECT 1")
        return {"status": "ok", "db": "connected"}


@router.get("/skill-info")
async def skill_info():
    """Return taxonomy statistics for monitoring."""
    async with get_async_conn() as conn:
        counts = {}
        tables = [
            "taxonomy_skills",
            "taxonomy_aliases",
            "taxonomy_skill_signals",
            "taxonomy_skill_embeddings",
            "taxonomy_phrase_patterns",
        ]
        for table in tables:
            cur = await conn.execute(f"SELECT count(*) FROM {table}")
            counts[table] = (await cur.fetchone())[0]

        return {
            "status": "ok",
            "taxonomy": counts,
            "pipeline_stages": {
                "implemented": [
                    "1_ingest", "2_extract", "3A_exact", "3B_phrase",
                    "3C_semantic", "4_score", "5_llm_fallback", "6_persist",
                    "7_profile",
                ],
            },
        }
