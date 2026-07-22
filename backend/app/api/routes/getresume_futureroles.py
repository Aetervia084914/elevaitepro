"""Future-role prediction endpoint — reads prompt template, calls OpenAI proxy,
returns structured Phase 1 (resume extraction) + Phase 2 (future roles).

No Redis caching of the response.
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status
from pydantic import BaseModel

from app.core.api_timing import record_api_time
from app.core.candidate_cache import cache_upload_result
from app.core.config import get_settings
from app.api.role_analysis import _resolve_candidate_id, upsert_suggested_roles

logger = logging.getLogger(__name__)

router = APIRouter(tags=["getresume-futureroles"])

settings = get_settings()
base = (settings.llm_base_url or "").rstrip("/")
endpoint = settings.llm_endpoint or "/openchat"
if not endpoint.startswith("/"):
    endpoint = "/" + endpoint
OPENCHAT_URL = f"{base}{endpoint}"
PROMPT_TEMPLATE_PATH = Path(__file__).resolve().parents[3] / "futureroleprediction.txt"

# Generous timeout — LLM calls can be slow
_OPENCHAT_TIMEOUT = httpx.Timeout(connect=10.0, read=180.0, write=10.0, pool=10.0)


# ── JSON helpers (ported from Next.js route) ─────────────────────────────────


def _strip_code_fences(value: str) -> str:
    normalized = (value or "").strip()
    if not normalized.startswith("```"):
        return normalized
    normalized = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", normalized)
    normalized = re.sub(r"\s*```$", "", normalized)
    return normalized.strip()


def _parse_json_content(value: str) -> dict | None:
    normalized = _strip_code_fences(value)
    if not normalized:
        return None
    try:
        return json.loads(normalized)
    except json.JSONDecodeError as exc:
        # Attempt simple repairs (unbalanced braces / brackets)
        repaired = normalized
        if "Unterminated string" in str(exc):
            repaired += '"'
        open_brackets = repaired.count("[") - repaired.count("]")
        open_braces = repaired.count("{") - repaired.count("}")
        repaired += "]" * max(open_brackets, 0)
        repaired += "}" * max(open_braces, 0)
        return json.loads(repaired)


def _extract_output(route_response: Any) -> dict | None:
    """Walk through known response shapes and return the parsed dict."""
    if not isinstance(route_response, dict):
        return None

    # { result: { answer: "..." } }
    result = route_response.get("result")
    if isinstance(result, dict):
        answer = result.get("answer")
        if isinstance(answer, str):
            return _parse_json_content(answer)
        if isinstance(answer, dict):
            return answer

    # { output: ... }
    output = route_response.get("output")
    if output is not None:
        return _parse_json_content(output) if isinstance(output, str) else output

    # { result: ... } (flat)
    if result is not None:
        return _parse_json_content(result) if isinstance(result, str) else result

    # OpenAI chat-completion format
    choices = route_response.get("choices") or []
    if choices:
        msg_content = (choices[0].get("message") or {}).get("content")
        if isinstance(msg_content, str):
            return _parse_json_content(msg_content)
        text_content = choices[0].get("text")
        if isinstance(text_content, str):
            return _parse_json_content(text_content)

    return route_response


def _normalize_role_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for item in value:
        s = str(item or "").strip()
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


# ── Core prediction function (importable by other routes) ────────────────────


async def predict_future_roles(
    raw_text: str,
    location: str = "",
    session_id: str | None = None,
) -> dict[str, Any]:
    """Run the future-role prediction pipeline.

    Reads the prompt template, calls the OpenAI proxy, parses and normalises
    the response.  Returns a dict ready to be serialised as JSON.

    Raises ``ValueError`` for bad input and ``RuntimeError`` for upstream
    failures.

    Parameters
    ----------
    raw_text:
        The resume text to analyse.
    location:
        User's location preference.
    session_id:
        Optional session identifier for logging (included in response file name).
    """
    _t0 = time.perf_counter()
    logger.info("[getresume_futureroles] ──── START ──── raw_text=%d chars, location=%r", len(raw_text), location)

    if not raw_text.strip():
        raise ValueError("raw_text is required")

    # 1. Read prompt template
    try:
        prompt_template = PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8")
        logger.info("[getresume_futureroles] Step 1: Prompt template loaded from %s (%d chars)", PROMPT_TEMPLATE_PATH.name, len(prompt_template))
    except FileNotFoundError:
        logger.error("[getresume_futureroles] Step 1 FAILED — template not found at %s", PROMPT_TEMPLATE_PATH)
        raise RuntimeError(
            f"Prompt template not found at {PROMPT_TEMPLATE_PATH}"
        )

    # 2. Build the full prompt
    user_input = f"RESUME TEXT:\n{raw_text}\n\nLOCATION:\n{location or 'Not specified'}"
    prompt = f"{prompt_template}\n\n{user_input}"

    if not prompt.strip():
        raise ValueError("Generated prompt is empty")

    logger.info("[getresume_futureroles] Step 2: Prompt built — %d chars", len(prompt))

    # 3. Call OpenAI proxy
    _t_llm = time.perf_counter()
    logger.info("[getresume_futureroles] Step 3: Calling OpenAI proxy at %s ...", OPENCHAT_URL)
    headers: dict[str, str] = {"Content-Type": "application/json"}
    api_key = os.getenv("API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        async with httpx.AsyncClient(timeout=_OPENCHAT_TIMEOUT) as client:
            resp = await client.post(
                OPENCHAT_URL,
                json={"prompt": prompt, "max_tokens": 8000, "temperature": 0},
                headers=headers,
            )
    except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
        logger.error(
            "[getresume_futureroles] Step 3 FAILED — cannot reach OpenAI proxy at %s after %.0fms: %s",
            OPENCHAT_URL, (time.perf_counter() - _t_llm) * 1000, exc,
        )
        raise RuntimeError(
            f"Cannot reach OpenAI proxy at {OPENCHAT_URL} — is the server running?"
        ) from exc

    _llm_ms = (time.perf_counter() - _t_llm) * 1000
    logger.info(
        "[getresume_futureroles] Step 3: OpenAI proxy responded — status=%d, body=%d bytes (%.0fms)",
        resp.status_code, len(resp.content), _llm_ms,
    )

    if resp.status_code != 200:
        error_text = resp.text
        logger.error(
            "[getresume_futureroles] Step 3 ERROR — OpenAI API status=%d: %s",
            resp.status_code, error_text[:500],
        )
        raise RuntimeError(
            f"OpenAI proxy returned {resp.status_code}: {error_text or 'Unknown error'}"
        )

    # 4. Parse response
    route_response = resp.json()
    output = _extract_output(route_response)

    if not output or not isinstance(output, dict):
        logger.error("[getresume_futureroles] Step 4 FAILED — invalid/malformed JSON from AI")
        raise RuntimeError("Invalid or malformed JSON response from AI")
    logger.info("[getresume_futureroles] Step 4: Response parsed — %d top-level keys", len(output))

    # 5. Normalise fields
    roles = _normalize_role_list(output.get("all_plausible_future_roles"))
    confidence_scores = (
        output["confidence_scores"]
        if isinstance(output.get("confidence_scores"), dict)
        else {}
    )
    why_suggested = (
        output["why_suggested"]
        if isinstance(output.get("why_suggested"), dict)
        else {}
    )

    logger.info(
        "[getresume_futureroles] ──── DONE ──── %d roles: %s (total %.0fms)",
        len(roles), roles, (time.perf_counter() - _t0) * 1000,
    )

    return {
        "success": True,
        # Phase 1 — extracted resume data (only AI-enriched fields, not duplicates of upload)
        "best_fit_industry": output.get("best_fit_industry"),
        "possible_job_titles": (
            output["possible_job_titles"]
            if isinstance(output.get("possible_job_titles"), list)
            else []
        ),
        "core_skills": (
            output["core_skills"]
            if isinstance(output.get("core_skills"), dict)
            else {}
        ),
        "tools_and_technologies": (
            output["tools_and_technologies"]
            if isinstance(output.get("tools_and_technologies"), dict)
            else {}
        ),
        "profile_summary": output.get("profile_summary"),  # ← Added profile_summary
        "education": output.get("education"),
        "certifications": (
            output["certifications"]
            if isinstance(output.get("certifications"), list)
            else []
        ),
        "work_experience": output.get("work_experience"),
        "projects": output.get("projects"),
        # Phase 2 — future role inference
        "inferred_seniority": str(output.get("inferred_seniority") or "").strip(),
        "roles": roles,
        "confidence_scores": confidence_scores,
        "why_suggested": why_suggested,
    }


# ── DB persistence (background task) ────────────────────────────────────────


def _persist_parsed_output(session_id: str, parsed_output: dict[str, Any]) -> None:
    """UPDATE user_cv_upload.parsed_output for the most recent row matching session_id.

    Runs in a background thread — never raises, logs warnings on failure.
    Covers both paths:
      • Standalone /getresume_futureroles calls (row may or may not exist yet)
      • /uploadresume flow (row already inserted by _persist_cv_upload; this fills
        the parsed_output column in case the INSERT ran before the LLM finished)
    """
    try:
        import json as _json
        from sqlalchemy import text
        from app.db.session import SessionLocal

        payload = _json.dumps(parsed_output, default=str)

        with SessionLocal() as db:
            result = db.execute(
                text(
                    """
                    UPDATE public.user_cv_upload
                       SET parsed_output = CAST(:parsed_output AS jsonb),
                           updated_at    = now()
                     WHERE session_id = :session_id
                       AND id = (
                           SELECT id
                             FROM public.user_cv_upload
                            WHERE session_id = :session_id
                            ORDER BY created_at DESC
                            LIMIT 1
                       )
                    """
                ),
                {"session_id": session_id, "parsed_output": payload},
            )
            db.commit()
            rows_updated = result.rowcount
        if rows_updated:
            logger.info(
                "[getresume_futureroles] parsed_output saved to user_cv_upload — session=%s",
                session_id,
            )
        else:
            logger.debug(
                "[getresume_futureroles] parsed_output UPDATE matched 0 rows — session=%s "
                "(row may not exist yet for standalone calls)",
                session_id,
            )
    except Exception as exc:
        logger.warning(
            "[getresume_futureroles] Could not persist parsed_output — session=%s: %s",
            session_id, exc,
        )


# ── HTTP endpoint ────────────────────────────────────────────────────────────


class _FutureRolesRequest(BaseModel):
    raw_text: str
    location: str = ""


@router.post("/getresume_futureroles")
async def getresume_futureroles_endpoint(
    payload: _FutureRolesRequest,
    background_tasks: BackgroundTasks,
    x_session_id: Annotated[str | None, Header()] = None,
):
    t0 = time.perf_counter()
    try:
        result = await predict_future_roles(payload.raw_text, payload.location, session_id=x_session_id)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        background_tasks.add_task(record_api_time, "/getresume_futureroles", elapsed_ms)

        # Persist parsed_output to user_cv_upload (non-blocking)
        if result and x_session_id:
            background_tasks.add_task(_persist_parsed_output, x_session_id, result)

        # Cache the full prediction payload to Redis
        if result and x_session_id:
            background_tasks.add_task(cache_upload_result, x_session_id, result)

        # Persist suggested roles to role_analyses table
        if result and x_session_id:
            cid = _resolve_candidate_id(x_session_id)
            if cid and result.get("roles"):
                background_tasks.add_task(
                    upsert_suggested_roles,
                    cid,
                    result["roles"],
                    result.get("why_suggested") or {},
                    result.get("confidence_scores") or {},
                    result.get("inferred_seniority") or "",
                    payload.location or "United Kingdom",
                )

        return result

    except ValueError as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        background_tasks.add_task(
            record_api_time, "/getresume_futureroles", elapsed_ms, "error",
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    except RuntimeError as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        error_msg = str(exc)
        is_conn = "Cannot reach" in error_msg or "ECONNREFUSED" in error_msg
        background_tasks.add_task(
            record_api_time, "/getresume_futureroles", elapsed_ms, "error",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE if is_conn else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )

    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        background_tasks.add_task(
            record_api_time, "/getresume_futureroles", elapsed_ms, "error",
        )
        logger.exception("[getresume_futureroles] Unexpected error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
