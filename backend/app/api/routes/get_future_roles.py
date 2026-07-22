"""GetFutureRoles endpoint — suggest plausible future career roles via LLM.

Ported from the Next.js route at app/api/getFutureRole/route.js so the
endpoint is served by the FastAPI backend on port 8002.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.api_timing import record_api_time


logger = logging.getLogger(__name__)

router = APIRouter(tags=["future-roles"])

# Prompt template lives in the repo root
_TEMPLATE_PATH = Path(__file__).resolve().parents[4] / "futurerolestaticpromt.txt"

# LLM call timeout (seconds)
_LLM_TIMEOUT: int = 120


# ── Request / Response models ─────────────────────────────────────────────────

class FutureRolesRequest(BaseModel):
    industry_domain: str = Field(default="", alias="industry/domain")
    current_job_title_selected: list[str] = Field(default_factory=list, alias="current job title selected")
    years_of_experience: str = ""
    normalized_tools: list[str] = Field(default_factory=list, alias="normalized tools")
    normalized_skills: list[str] = Field(default_factory=list, alias="normalized skills")
    certifications: list[str] = Field(default_factory=list)
    location: str = ""

    model_config = {"populate_by_name": True}


class FutureRolesResponse(BaseModel):
    success: bool
    roles: list[str] = Field(default_factory=list)
    inferred_seniority: str = ""
    confidence_scores: dict[str, float] = Field(default_factory=dict)
    why_suggested: dict[str, str] = Field(default_factory=dict)
    output: dict[str, Any] | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_template() -> str:
    """Read the static prompt template from disk."""
    if not _TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"Prompt template not found: {_TEMPLATE_PATH}")
    return _TEMPLATE_PATH.read_text(encoding="utf-8")


def _build_prompt(template: str, payload: FutureRolesRequest) -> str:
    """Replace {{placeholders}} with payload values."""
    replacements: dict[str, str] = {
        "{{industry}}": payload.industry_domain.strip() or "",
        "{{current_titles}}": json.dumps(payload.current_job_title_selected),
        "{{years_of_experience}}": payload.years_of_experience.strip() or "",
        "{{normalized_tools}}": json.dumps(payload.normalized_tools),
        "{{normalized_skills}}": json.dumps(payload.normalized_skills),
        "{{certifications}}": json.dumps(payload.certifications),
        "{{location}}": payload.location.strip() or "",
    }
    prompt = template
    for placeholder, value in replacements.items():
        prompt = prompt.replace(placeholder, value)
    return prompt


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _parse_json_lenient(raw: str) -> dict | None:
    """Parse JSON with basic truncation repair."""
    raw = _strip_code_fences(raw)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Attempt simple bracket repair
        repaired = raw
        open_braces = repaired.count("{") - repaired.count("}")
        open_brackets = repaired.count("[") - repaired.count("]")
        repaired += "]" * max(0, open_brackets)
        repaired += "}" * max(0, open_braces)
        return json.loads(repaired)


def _extract_output(response_data: dict) -> dict | None:
    """Extract the useful payload from various LLM response shapes."""
    # Shape: { output: ... }
    if "output" in response_data:
        val = response_data["output"]
        return _parse_json_lenient(val) if isinstance(val, str) else val
    # Shape: { result: ... }
    if "result" in response_data:
        val = response_data["result"]
        return _parse_json_lenient(val) if isinstance(val, str) else val
    # Shape: OpenAI chat completions
    try:
        content = response_data["choices"][0]["message"]["content"]
        return _parse_json_lenient(content) if isinstance(content, str) else content
    except (KeyError, IndexError, TypeError):
        pass
    try:
        text = response_data["choices"][0]["text"]
        return _parse_json_lenient(text) if isinstance(text, str) else text
    except (KeyError, IndexError, TypeError):
        pass
    # Fallback: treat entire response as the output
    return response_data if isinstance(response_data, dict) else None


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/getFutureRoles", response_model=FutureRolesResponse)
async def get_future_roles(
    payload: FutureRolesRequest,
    background_tasks: BackgroundTasks,
    x_session_id: Annotated[str | None, Header()] = None,
) -> FutureRolesResponse:
    """Suggest plausible future career roles based on the candidate profile."""
    _t0 = time.perf_counter()

    # 1 — Build prompt
    try:
        template = _load_template()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    prompt = _build_prompt(template, payload)
    if not prompt.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Generated prompt is empty")

    logger.info("[getFutureRoles] Prompt built, length=%d", len(prompt))

    # 2 — Call LLM
    settings = get_settings()
    llm_url = f"{settings.llm_base_url}{settings.llm_endpoint}"

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.openai_api_key and settings.openai_api_key != "your-openai-api-key-here":
        headers["Authorization"] = f"Bearer {settings.openai_api_key}"

    body = {
        "prompt": prompt,
        "max_tokens": 8000,
        "temperature": 0,
    }

    try:
        async with httpx.AsyncClient(timeout=_LLM_TIMEOUT) as client:
            resp = await client.post(llm_url, json=body, headers=headers)
        if resp.status_code != 200:
            logger.error("[getFutureRoles] LLM API error %d: %s", resp.status_code, resp.text[:500])
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"LLM API call failed ({resp.status_code})",
            )
        response_data = resp.json()
    except httpx.HTTPError as exc:
        logger.error("[getFutureRoles] LLM request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM API request failed",
        ) from exc

    # 3 — Parse response
    output = _extract_output(response_data)
    if not output or not isinstance(output, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid or malformed JSON response from LLM",
        )

    raw_roles = output.get("all_plausible_future_roles", [])
    roles = list(dict.fromkeys(str(r).strip() for r in raw_roles if r))  # dedupe, preserve order
    confidence_scores = output.get("confidence_scores", {}) if isinstance(output.get("confidence_scores"), dict) else {}
    why_suggested = output.get("why_suggested", {}) if isinstance(output.get("why_suggested"), dict) else {}
    inferred_seniority = str(output.get("inferred_seniority", "")).strip()

    logger.info("[getFutureRoles] Received %d roles: %s", len(roles), roles)

    resp = FutureRolesResponse(
        success=True,
        roles=roles,
        inferred_seniority=inferred_seniority,
        confidence_scores=confidence_scores,
        why_suggested=why_suggested,
        output=output,
    )

    # Record API timing (fire-and-forget)
    _elapsed_ms = (time.perf_counter() - _t0) * 1000
    asyncio.ensure_future(record_api_time("/getFutureRoles", _elapsed_ms))

    # Persist suggested roles to role_analyses table
    if x_session_id and roles:
        from app.api.role_analysis import _resolve_candidate_id, upsert_suggested_roles
        cid = _resolve_candidate_id(x_session_id)
        if cid:
            background_tasks.add_task(
                upsert_suggested_roles,
                cid,
                roles,
                why_suggested,
                confidence_scores,
                inferred_seniority,
                payload.location or "United Kingdom",
            )

    return resp
