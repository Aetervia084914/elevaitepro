"""
Skill extraction API — upload a CV (file or raw text) and get matched
taxonomy skills using FlashText exact match and rapidfuzz fuzzy match.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

from app.core.async_db import get_async_conn
from app.core.api_timing import record_api_time
from app.services.resume_parser.text_extractor import extract_text
from app.services.skill_extract.engine import MatchedSkill, SkillIndex, extract_skills
from app.services.skill_extract.profiling import build_profile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/skill-extract", tags=["skill-extract"])


# ── Response schemas ─────────────────────────────────────────────────────────

class SkillItem(BaseModel):
    skill_id: int
    canonical_name: str
    skill_type: str | None = None
    match_source: str          # exact | fuzzy | llm | llm_discovered
    confidence: float
    span: str                  # original matched text
    in_taxonomy: bool = True   # False for LLM-discovered skills not in DB

class ProfileItem(BaseModel):
    industry: dict | None = None
    occupations: list[dict] = []
    job_level: dict | None = None


class SkillExtractResponse(BaseModel):
    success: bool = True
    total: int
    skills: list[SkillItem]
    profile: ProfileItem | None = None
    stages_used: list[str]
    elapsed_ms: float
    raw_text_length: int


# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_index(request: Request) -> SkillIndex:
    idx: SkillIndex | None = getattr(request.app.state, "skill_extract_index", None)
    if idx is None or not idx.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Skill extraction index not loaded yet. Try again shortly.",
        )
    return idx


def _filter_skills_by_industry(
    skills: list,
    industry_skill_ids: set[int] | None,
) -> list:
    """Keep only skills whose skill_id belongs to the winning industry.

    If no industry was detected or the filter would remove *all* skills,
    return the original list unchanged (graceful fallback).
    """
    if not industry_skill_ids:
        return skills
    filtered = [s for s in skills if s.skill_id in industry_skill_ids]
    return filtered if filtered else skills


_LOWER_WORDS = frozenset({
    "a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet",
    "at", "by", "in", "of", "on", "to", "up", "as", "is",
})


def _capitalise(name: str) -> str:
    """Title-case *name* intelligently.

    - Every word is capitalised UNLESS it is a common article/preposition
      AND it is not the first word.
    - Already-uppercase tokens (acronyms like SQL, AWS, CI/CD) are preserved.
    - Capitalises the first *alphabetic* character of each word so leading
      punctuation like ``(`` is handled gracefully.

    Examples:
        "physics"                     → "Physics"
        "natural language processing" → "Natural Language Processing"
        "data science"                → "Data Science"
        "SQL"                         → "SQL"
        "history of art"              → "History of Art"
        "ML (computer programming)"   → "ML (Computer Programming)"
        "electronic communication"    → "Electronic Communication"
    """
    if not name:
        return name
    words = name.split(" ")
    result = []
    for i, word in enumerate(words):
        if not word:
            result.append(word)
            continue
        alpha = "".join(c for c in word if c.isalpha())
        if not alpha:
            result.append(word)
            continue
        # Preserve fully-uppercase tokens (acronyms: SQL, AWS, CI/CD, NLP…)
        if alpha.isupper() and len(alpha) > 1:
            result.append(word)
        elif i > 0 and alpha.lower() in _LOWER_WORDS:
            result.append(word.lower())
        else:
            # Capitalise the first alphabetic character in the word
            out, capped = [], False
            for ch in word:
                if ch.isalpha() and not capped:
                    out.append(ch.upper())
                    capped = True
                else:
                    out.append(ch)
            result.append("".join(out))
    return " ".join(result)


def _to_response(
    result,
    profile: dict | None = None,
    filtered_skills: list | None = None,
) -> SkillExtractResponse:
    profile_item = None
    if profile:
        profile_item = ProfileItem(
            industry=profile.get("industry"),
            occupations=profile.get("occupations", []),
            job_level=profile.get("job_level"),
        )
    skills = filtered_skills if filtered_skills is not None else result.skills

    # ── Capitalise + deduplicate by lower(canonical_name) ─────────────────
    # When the same name appears in different cases (e.g. "Physics" / "physics"),
    # keep the version that is in_taxonomy (taxonomy canonical casing is preferred),
    # then fall back to higher confidence.  Position in the list is preserved for
    # the winner so response order stays deterministic.
    seen: dict[str, tuple[int, SkillItem]] = {}   # lower_name → (index, item)
    deduped: list[SkillItem] = []

    for m in skills:
        name = _capitalise(m.canonical_name or "")
        item = SkillItem(
            skill_id=m.skill_id,
            canonical_name=name,
            skill_type=m.skill_type,
            match_source=m.match_source,
            confidence=m.confidence,
            span=m.span,
            in_taxonomy=m.in_taxonomy,
        )
        key = name.lower()
        if key not in seen:
            deduped.append(item)
            seen[key] = (len(deduped) - 1, item)
        else:
            prev_idx, prev_item = seen[key]
            prefer_new = (
                (m.in_taxonomy and not prev_item.in_taxonomy)
                or (m.in_taxonomy == prev_item.in_taxonomy and m.confidence > prev_item.confidence)
            )
            if prefer_new:
                deduped[prev_idx] = item
                seen[key] = (prev_idx, item)

    return SkillExtractResponse(
        success=True,
        total=len(deduped),
        skills=deduped,
        profile=profile_item,
        stages_used=result.stages_used,
        elapsed_ms=result.elapsed_ms,
        raw_text_length=result.raw_text_length,
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/file",
    response_model=SkillExtractResponse,
    summary="Extract skills from an uploaded CV file",
    responses={
        422: {"description": "Unsupported file or text extraction failed"},
        503: {"description": "Index not loaded yet"},
    },
)
async def extract_skills_from_file(
    request: Request,
    file: UploadFile = File(...),
    use_llm: bool = Form(True),
):
    """
    Upload a CV (PDF / DOCX / DOC / TXT, max 10 MB) and extract skills
    matched against the taxonomy_skills table.

    Two-stage pipeline: FlashText exact → rapidfuzz fuzzy.
    """
    _t0 = time.perf_counter()
    index = _get_index(request)

    file_bytes = await file.read()
    filename = file.filename or "resume"

    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    try:
        raw_text = extract_text(file_bytes, filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if not raw_text or len(raw_text.strip()) < 20:
        raise HTTPException(status_code=422, detail="Extracted text is too short or empty.")

    result = await extract_skills(raw_text, index, use_llm=use_llm)

    # Post-extraction profiling: industry, occupation, job level
    profile = {}
    try:
        async with get_async_conn() as conn:
            skill_dicts = [
                {"skill_id": m.skill_id, "confidence": m.confidence}
                for m in result.skills if m.skill_id > 0
            ]
            profile = await build_profile(conn, skill_dicts, raw_text=raw_text)
    except Exception:
        logger.warning("Profiling failed for /file — returning skills without profile")

    # Filter skills to only those belonging to the detected industry
    filtered = _filter_skills_by_industry(
        result.skills, profile.get("industry_skill_ids"),
    )
    resp = _to_response(result, profile=profile, filtered_skills=filtered)

    # Record API timing (fire-and-forget, non-blocking)
    _elapsed_ms = (time.perf_counter() - _t0) * 1000
    asyncio.ensure_future(record_api_time("/skill-extract/file", _elapsed_ms))

    return resp


@router.post(
    "/text",
    response_model=SkillExtractResponse,
    summary="Extract skills from raw text",
    responses={
        422: {"description": "Text is empty or too short"},
        503: {"description": "Index not loaded yet"},
    },
)
async def extract_skills_from_text(
    request: Request,
    text: str = Form(..., description="Raw CV / resume text"),
    use_llm: bool = Form(True),
):
    """
    Submit raw resume text and extract skills matched against taxonomy_skills.

    Two-stage pipeline: FlashText exact → rapidfuzz fuzzy.
    """
    index = _get_index(request)

    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=422, detail="Text is empty or too short.")

    clean_text = text.strip()
    result = await extract_skills(clean_text, index, use_llm=use_llm)

    # Post-extraction profiling: industry, occupation, job level
    profile = {}
    try:
        async with get_async_conn() as conn:
            skill_dicts = [
                {"skill_id": m.skill_id, "confidence": m.confidence}
                for m in result.skills if m.skill_id > 0
            ]
            profile = await build_profile(conn, skill_dicts, raw_text=clean_text)
    except Exception:
        logger.warning("Profiling failed for /text — returning skills without profile")

    # Filter skills to only those belonging to the detected industry
    filtered = _filter_skills_by_industry(
        result.skills, profile.get("industry_skill_ids"),
    )
    return _to_response(result, profile=profile, filtered_skills=filtered)


@router.get("/health", summary="Health check for skill extraction index")
async def skill_extract_health(request: Request):
    idx: SkillIndex | None = getattr(request.app.state, "skill_extract_index", None)
    if idx is None or not idx.ready:
        return {"status": "not_ready", "skills_loaded": 0, "aliases_loaded": 0}
    return {
        "status": "ok",
        "skills_loaded": len(idx._by_name),
        "aliases_loaded": len(idx._by_alias),
    }
