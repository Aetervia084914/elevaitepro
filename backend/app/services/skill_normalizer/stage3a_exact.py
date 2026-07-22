"""Stage 3A — Exact Match + Alias Resolution (Primary Extraction)."""
from __future__ import annotations

import logging
import re
import time
from typing import Any

from app.schemas.skill_normalizer import PipelineContext, SkillCandidate, StageStatus

log = logging.getLogger(__name__)

EXACT_CONFIDENCE: float = 1.0
ALIAS_BASE_CONFIDENCE: float = 0.92
BATCH_SIZE: int = 2000


# -- Tokenisation -------------------------------------------------------------

_WORD_RE = re.compile(r"[A-Za-z0-9#\+\.]+(?:[-/][A-Za-z0-9#\+\.]+)*")


def _tokenise(text: str) -> list[tuple[str, int, int]]:
    """Extract word tokens with (token, start, end) positions."""
    return [(m.group(), m.start(), m.end()) for m in _WORD_RE.finditer(text)]


def _build_ngrams(
    tokens: list[tuple[str, int, int]],
    max_n: int = 4,
) -> list[tuple[str, int, int]]:
    """Build 1-4-gram windows from tokens."""
    ngrams: list[tuple[str, int, int]] = []
    for i, (tok, start, end) in enumerate(tokens):
        if len(tok) < 2:
            continue
        ngrams.append((tok, start, end))
        for n in range(2, max_n + 1):
            if i + n > len(tokens):
                break
            last_tok, _, last_end = tokens[i + n - 1]
            gram = " ".join(t[0] for t in tokens[i : i + n])
            ngrams.append((gram, start, last_end))
    return ngrams


# -- DB lookup ----------------------------------------------------------------

async def _batch_alias_lookup(
    conn,
    ngram_lowers: list[str],
) -> dict[str, list[dict[str, Any]]]:
    """Batch lookup ngrams against taxonomy_aliases."""
    if not ngram_lowers:
        return {}

    result: dict[str, list[dict[str, Any]]] = {}
    for i in range(0, len(ngram_lowers), BATCH_SIZE):
        batch = ngram_lowers[i : i + BATCH_SIZE]
        cur = await conn.execute(
            """
            SELECT ta.alias_lower,
                   ta.skill_id,
                   ts.canonical_name,
                   ta.confidence_modifier
            FROM taxonomy_aliases ta
            JOIN taxonomy_skills ts USING (skill_id)
            WHERE ta.alias_lower = ANY(%s)
            """,
            (batch,),
        )
        for row in await cur.fetchall():
            alias_low, skill_id, canonical, conf_mod = row
            result.setdefault(alias_low, []).append({
                "skill_id": skill_id,
                "canonical_name": canonical,
                "confidence_modifier": float(conf_mod) if conf_mod else 0.0,
            })
    return result


# -- Main entry point ---------------------------------------------------------

async def run_stage3a(
    ctx: PipelineContext,
    conn,
) -> PipelineContext:
    """Execute Stage 3A: Exact Match + Alias Resolution."""
    t0 = time.perf_counter()

    text = ctx.raw_text
    text_lower = text.lower()

    # 3A-1. Tokenise and build ngrams
    tokens = _tokenise(text)
    ngrams = _build_ngrams(tokens, max_n=4)

    seen: dict[str, tuple[int, int, str]] = {}
    for gram, start, end in ngrams:
        low = gram.lower()
        if low not in seen:
            seen[low] = (start, end, gram)

    ngram_lowers = list(seen.keys())
    log.debug("Stage 3A: %d tokens -> %d unique ngrams", len(tokens), len(ngram_lowers))

    # 3A-2. Batch DB lookup
    alias_map = await _batch_alias_lookup(conn, ngram_lowers)

    # 3A-3. Build candidates
    exact_count = 0
    alias_count = 0
    seen_skills: dict[int, float] = {}

    for low, hits in alias_map.items():
        start, end, original = seen[low]

        for hit in hits:
            skill_id = hit["skill_id"]
            canonical = hit["canonical_name"]
            conf_mod = hit["confidence_modifier"]

            is_exact = (low == canonical.lower())
            base = EXACT_CONFIDENCE if is_exact else ALIAS_BASE_CONFIDENCE

            if len(original.strip()) <= 3 and not is_exact:
                if original != canonical and original not in text:
                    continue

            confidence = min(base + conf_mod, 1.0)

            if skill_id in seen_skills and seen_skills[skill_id] >= confidence:
                continue

            seen_skills[skill_id] = confidence

            if is_exact:
                exact_count += 1
            else:
                alias_count += 1

            ctx.candidates = [
                c for c in ctx.candidates if c.skill_id != skill_id
            ]

            ctx.candidates.append(SkillCandidate(
                skill_id=skill_id,
                canonical_name=canonical,
                source_stage="3A",
                confidence=confidence,
                matched_text=original,
            ))

            ctx.matched_spans.append((start, end))

    duration_ms = int((time.perf_counter() - t0) * 1000)

    ctx.add_stage_result(
        stage="3A",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "exact_match_count": exact_count,
            "alias_match_count": alias_count,
            "total_candidates":  len(ctx.candidates),
            "ngrams_tested":     len(ngram_lowers),
        },
    )

    log.info(
        "Stage 3A OK — exact=%d alias=%d total=%d ngrams=%d %dms",
        exact_count, alias_count, len(ctx.candidates), len(ngram_lowers), duration_ms,
    )
    return ctx
