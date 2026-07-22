"""Stage 5 LLM fallback client — OpenAI GPT via a local OpenAI-compatible endpoint."""
from __future__ import annotations

import json
import logging
import re

from app.core.config import get_settings

log = logging.getLogger(__name__)

MAX_TOKENS: int     = 400
TEMPERATURE: float  = 0.0
SKILL_INJECT_LIMIT: int = 500
MAX_TEXT_CHARS: int = 50_000


def _check_config() -> None:
    """Raise RuntimeError at startup if required env vars are missing."""
    settings = get_settings()
    if not settings.llm_base_url:
        raise RuntimeError("LLM_BASE_URL is not set in .env.")
    llm_url = settings.llm_base_url.rstrip("/") + settings.llm_endpoint
    log.info(
        "LLM client configured — endpoint=%s  model=%s  skill_inject_limit=%d",
        llm_url, settings.llm_model, SKILL_INJECT_LIMIT,
    )


# -- Prompt builder -----------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a professional skill extraction system.
You will be given a list of valid canonical skill names and a resume text.
Extract ONLY skills that are present in the canonical skill list.
Rules:
  - Return JSON only: {"skills": ["skill_name_1", "skill_name_2", ...]}
  - Use exact canonical names from the provided list — no paraphrasing.
  - Do NOT include job titles, company names, education degrees, or generic terms.
  - Do NOT hallucinate skills not present in the text.
  - If no skills found, return {"skills": []}.
"""


def _build_messages(raw_text: str, top_skills: list[str]) -> list[dict]:
    if len(raw_text) > MAX_TEXT_CHARS:
        raw_text = raw_text[:MAX_TEXT_CHARS]
        log.debug("Raw text truncated to %d chars for LLM prompt.", MAX_TEXT_CHARS)

    skills_block = "\n".join(f"- {s}" for s in top_skills[:SKILL_INJECT_LIMIT])

    user_content = (
        f"VALID CANONICAL SKILLS (top {min(len(top_skills), SKILL_INJECT_LIMIT)}):\n"
        f"{skills_block}\n\n"
        f"RESUME TEXT:\n{raw_text}\n\n"
        f"Return JSON only."
    )
    return [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": user_content},
    ]


# -- HTTP call ----------------------------------------------------------------

async def _post_llm(messages: list[dict]) -> str:
    """POST to the local OpenAI-compatible endpoint and return the raw response text."""
    try:
        import httpx
    except ImportError:
        raise RuntimeError("httpx not installed. Run: pip install httpx")

    settings = get_settings()
    llm_url = settings.llm_base_url.rstrip("/") + settings.llm_endpoint

    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(llm_url, json=payload, headers=headers)

    if resp.status_code != 200:
        raise RuntimeError(
            f"LLM endpoint returned HTTP {resp.status_code}: {resp.text[:300]}"
        )
    return resp.text


# -- Response parser ----------------------------------------------------------

def _parse_response(raw: str) -> list[str]:
    """Extract skills list from the LLM JSON response."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("LLM response is not valid JSON — attempting regex fallback.")
        m = re.search(r'\{.*?"skills"\s*:\s*\[.*?\]\s*\}', raw, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group())
            except json.JSONDecodeError:
                log.error("Regex JSON extraction also failed. Returning empty list.")
                return []
        else:
            return []

    # OpenAI-style wrapper: choices[0].message.content
    if "choices" in data:
        try:
            content = data["choices"][0]["message"]["content"]
            data = json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError):
            log.warning("Could not unwrap OpenAI choices structure.")
            return []

    skills = data.get("skills", [])
    if not isinstance(skills, list):
        log.warning("LLM 'skills' field is not a list: %r", skills)
        return []

    return [str(s).strip() for s in skills if s and str(s).strip()]


# -- Public API ---------------------------------------------------------------

async def extract_skills_llm(
    raw_text: str,
    top_skills: list[str],
) -> list[str]:
    """Stage 5 entry point — extract skills from raw_text using the GPT LLM fallback."""
    if not top_skills:
        log.warning("Stage 5: top_skills list is empty — LLM will have no grounding.")

    messages = _build_messages(raw_text, top_skills)
    try:
        raw = await _post_llm(messages)
        skills = _parse_response(raw)
        log.info("Stage 5 LLM extracted %d skills.", len(skills))
        return skills
    except Exception as exc:
        log.error("Stage 5 LLM call failed: %s", exc)
        return []
