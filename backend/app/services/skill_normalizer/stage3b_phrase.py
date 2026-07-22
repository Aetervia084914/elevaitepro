"""Stage 3B — Phrase Pattern Matching (Secondary Extraction)."""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Any

from app.schemas.skill_normalizer import PipelineContext, SkillCandidate, StageStatus

log = logging.getLogger(__name__)

PHRASE_BASE_CONFIDENCE: float = 0.70
COOCCURRENCE_BOOST: float = 0.03
LOW_FREQ_PENALTY: float = -0.05
LOW_FREQ_THRESHOLD: int = 50


# -- Pattern data -------------------------------------------------------------

@dataclass(frozen=True)
class PhrasePattern:
    pattern_id:       int
    pattern_regex:    str
    skill_id:         int | None
    base_confidence:  float
    kaggle_frequency: int
    domain_hint:      str
    priority:         int
    compiled:         re.Pattern


async def load_phrase_patterns(conn) -> list[PhrasePattern]:
    """Load all phrase patterns from taxonomy_phrase_patterns at startup."""
    cur = await conn.execute(
        """
        SELECT pattern_id, pattern_regex, skill_id,
               COALESCE(base_confidence, 0.70), COALESCE(kaggle_frequency, 0),
               COALESCE(domain_hint, ''), COALESCE(priority, 0)
        FROM taxonomy_phrase_patterns
        WHERE skill_id IS NOT NULL
        ORDER BY priority DESC
        """
    )
    rows = await cur.fetchall()
    patterns: list[PhrasePattern] = []
    compile_errors = 0

    for pid, regex_str, skill_id, conf, freq, domain, prio in rows:
        try:
            compiled = re.compile(regex_str, re.IGNORECASE)
            patterns.append(PhrasePattern(
                pattern_id=pid,
                pattern_regex=regex_str,
                skill_id=skill_id,
                base_confidence=float(conf),
                kaggle_frequency=int(freq),
                domain_hint=domain or "",
                priority=int(prio),
                compiled=compiled,
            ))
        except re.error:
            compile_errors += 1

    log.info(
        "Loaded %d phrase patterns (%d compile errors skipped).",
        len(patterns), compile_errors,
    )
    return patterns


# -- Co-occurrence lookup -----------------------------------------------------

async def _get_cooccurrence_boost(
    conn,
    skill_id: int,
    existing_skill_ids: set[int],
) -> float:
    """Check if skill_id co-occurs with any skill already in the candidate set."""
    if not existing_skill_ids:
        return 0.0

    cur = await conn.execute(
        """
        SELECT COALESCE(SUM(co_count), 0)
        FROM taxonomy_skill_cooccurrence
        WHERE (skill_id_a = %s AND skill_id_b = ANY(%s))
           OR (skill_id_b = %s AND skill_id_a = ANY(%s))
        """,
        (skill_id, list(existing_skill_ids), skill_id, list(existing_skill_ids)),
    )
    row = await cur.fetchone()
    total = row[0] if row else 0
    return COOCCURRENCE_BOOST if total > 0 else 0.0


# -- Main entry point ---------------------------------------------------------

async def run_stage3b(
    ctx: PipelineContext,
    conn,
    patterns: list[PhrasePattern],
) -> PipelineContext:
    """Execute Stage 3B: Phrase Pattern Matching."""
    t0 = time.perf_counter()

    text = ctx.raw_text
    existing_skill_ids = {c.skill_id for c in ctx.candidates}
    existing_confidence = {c.skill_id: c.confidence for c in ctx.candidates}

    phrase_count = 0
    patterns_tested = 0

    for pat in patterns:
        patterns_tested += 1
        match = pat.compiled.search(text)
        if not match:
            continue

        skill_id = pat.skill_id
        if skill_id is None:
            continue

        confidence = pat.base_confidence

        if pat.kaggle_frequency < LOW_FREQ_THRESHOLD:
            confidence += LOW_FREQ_PENALTY

        cooccur_boost = await _get_cooccurrence_boost(conn, skill_id, existing_skill_ids)
        confidence += cooccur_boost

        confidence = min(max(confidence, 0.0), 1.0)

        if skill_id in existing_confidence and existing_confidence[skill_id] >= confidence:
            continue

        cur = await conn.execute(
            "SELECT canonical_name FROM taxonomy_skills WHERE skill_id = %s",
            (skill_id,),
        )
        row = await cur.fetchone()
        if not row:
            continue

        canonical_name = row[0]
        matched_text = match.group()[:80]

        ctx.candidates = [c for c in ctx.candidates if c.skill_id != skill_id]

        ctx.candidates.append(SkillCandidate(
            skill_id=skill_id,
            canonical_name=canonical_name,
            source_stage="3B",
            confidence=confidence,
            matched_text=matched_text,
        ))

        ctx.matched_spans.append((match.start(), match.end()))
        existing_skill_ids.add(skill_id)
        existing_confidence[skill_id] = confidence
        phrase_count += 1

    duration_ms = int((time.perf_counter() - t0) * 1000)

    ctx.add_stage_result(
        stage="3B",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "phrase_match_count": phrase_count,
            "patterns_tested":   patterns_tested,
            "total_candidates":  len(ctx.candidates),
        },
    )

    log.info(
        "Stage 3B OK — phrases=%d tested=%d total=%d %dms",
        phrase_count, patterns_tested, len(ctx.candidates), duration_ms,
    )
    return ctx
