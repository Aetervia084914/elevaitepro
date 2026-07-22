from __future__ import annotations

import json
from json import JSONDecodeError
from typing import Any, Dict

from openai import OpenAI

from .config import settings


def _build_system_instructions() -> str:
    return (
        "You are a service that must return ONLY valid JSON. "
        "Do not include markdown, code fences, or extra text."
    )


def generate_json(prompt: str, *, max_tokens: int, temperature: float) -> Dict[str, Any]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Set it in .env")

    client = OpenAI(api_key=settings.openai_api_key)

    resp = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": _build_system_instructions()},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        max_completion_tokens=max_tokens,
        temperature=temperature,
    )

    content = resp.choices[0].message.content or "{}"
    try:
        return json.loads(content)
    except JSONDecodeError as e:
        raw_preview = content.replace("\n", "\\n")
        raw_preview = raw_preview[:2000]

        repair_prompt = (
            "The previous response was not valid JSON and could not be parsed. "
            "Return ONLY valid JSON (no markdown, no explanations). "
            "Fix any syntax issues (quotes, commas, braces) and output the corrected JSON only. "
            "Here is the invalid JSON to fix:\n" + content
        )

        retry = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _build_system_instructions()},
                {"role": "user", "content": repair_prompt},
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=max_tokens,
            temperature=0,
        )

        fixed = retry.choices[0].message.content or "{}"
        try:
            return json.loads(fixed)
        except JSONDecodeError as e2:
            return {
                "error": "invalid_json_from_model",
                "parse_error": str(e2),
                "text": fixed,
            }
