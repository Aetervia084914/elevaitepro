"""Stage 4 — Confidence Scoring, Deduplication & Demand Signal Boost."""
from __future__ import annotations

import logging
import time
from typing import Any

from app.schemas.skill_normalizer import PipelineContext, StageStatus

log = logging.getLogger(__name__)

# -- Scoring constants --------------------------------------------------------
ONET_IMPORTANCE_THRESHOLD: float = 4.0
ONET_IMPORTANCE_BONUS: float = 0.05
BLS_GROWTH_THRESHOLD: float = 10.0
BLS_GROWTH_BONUS: float = 0.03
CEDEFOP_SHORTAGE_BONUS: float = 0.02
MAX_SKILLS: int = 30
DEFAULT_CONFIDENCE_FLOOR: float = 0.62

EXCLUDE_SKILL_TYPES: frozenset[str] = frozenset({"Common Skill", "skill_group"})
EXCLUDE_FLAG_TOKENS: frozenset[str] = frozenset({"transversal"})


# -- Blacklist loader ---------------------------------------------------------

async def load_blacklist(conn) -> set[str]:
    """Load blacklisted terms at startup."""
    cur = await conn.execute(
        """
        SELECT term_lower FROM taxonomy_skill_blacklist
        WHERE COALESCE(whitelist_override, false) = false
        """
    )
    rows = await cur.fetchall()
    bl = {r[0].strip().lower() for r in rows if r[0]}
    log.info("Loaded %d blacklisted terms.", len(bl))
    return bl


# -- Signal lookup ------------------------------------------------------------

async def _fetch_signals(
    conn,
    skill_ids: list[int],
) -> dict[int, dict[str, Any]]:
    """Fetch scoring signals for a batch of skill_ids."""
    if not skill_ids:
        return {}

    cur = await conn.execute(
        """
        SELECT ts.skill_id,
               COALESCE(ts.onet_importance, 0)       AS onet_importance,
               COALESCE(ts.confidence_floor, %s)     AS confidence_floor,
               COALESCE(tss.bls_growth_rate, 0)      AS bls_growth_rate,
               COALESCE(tss.cedefop_demand_score, 0) AS cedefop_demand_score,
               COALESCE(tss.shortage_flag, false)    AS shortage_flag,
               COALESCE(ts.skill_type, '')            AS skill_type,
               COALESCE(ts.skill_category_flags, '{}') AS skill_category_flags
        FROM taxonomy_skills ts
        LEFT JOIN taxonomy_skill_signals tss USING (skill_id)
        WHERE ts.skill_id = ANY(%s)
        """,
        (DEFAULT_CONFIDENCE_FLOOR, skill_ids),
    )
    rows = await cur.fetchall()
    return {
        row[0]: {
            "onet_importance":       float(row[1]),
            "confidence_floor":      float(row[2]),
            "bls_growth_rate":       float(row[3]),
            "cedefop_demand_score":  float(row[4]),
            "shortage_flag":         bool(row[5]),
            "skill_type":            row[6],
            "skill_category_flags":  row[7] if isinstance(row[7], list) else [],
        }
        for row in rows
    }


# -- Main entry point ---------------------------------------------------------

async def run_stage4(
    ctx: PipelineContext,
    conn,
    blacklist: set[str],
) -> PipelineContext:
    """Execute Stage 4: Confidence Scoring, Deduplication & Demand Signal Boost."""
    t0 = time.perf_counter()

    initial_count = len(ctx.candidates)

    # Step 1: Hard blacklist exclusion
    if blacklist:
        ctx.candidates = [
            c for c in ctx.candidates
            if c.canonical_name.lower() not in blacklist
        ]
    blacklist_removed = initial_count - len(ctx.candidates)

    # Step 1b: Deduplicate by skill_id
    best: dict[int, int] = {}
    for i, c in enumerate(ctx.candidates):
        if c.skill_id not in best or c.confidence > ctx.candidates[best[c.skill_id]].confidence:
            best[c.skill_id] = i
    ctx.candidates = [ctx.candidates[i] for i in sorted(best.values())]
    dedup_removed = initial_count - blacklist_removed - len(ctx.candidates)

    # Step 2: Fetch scoring signals
    skill_ids = [c.skill_id for c in ctx.candidates]
    signals = await _fetch_signals(conn, skill_ids)

    # Step 2b: Filter transversal & generic skill types
    pre_type_count = len(ctx.candidates)
    ctx.candidates = [
        c for c in ctx.candidates
        if (
            signals.get(c.skill_id, {}).get("skill_type", "") not in EXCLUDE_SKILL_TYPES
            and not EXCLUDE_FLAG_TOKENS.intersection(
                signals.get(c.skill_id, {}).get("skill_category_flags", [])
            )
        )
    ]
    type_filtered = pre_type_count - len(ctx.candidates)
    if type_filtered:
        log.info("Stage 4: filtered %d transversal/generic candidates.", type_filtered)

    # Step 3: Apply composite confidence score
    for c in ctx.candidates:
        sig = signals.get(c.skill_id, {})
        bonus = 0.0

        if sig.get("onet_importance", 0) >= ONET_IMPORTANCE_THRESHOLD:
            bonus += ONET_IMPORTANCE_BONUS

        if sig.get("bls_growth_rate", 0) > BLS_GROWTH_THRESHOLD:
            bonus += BLS_GROWTH_BONUS

        if sig.get("shortage_flag", False):
            bonus += CEDEFOP_SHORTAGE_BONUS

        c.confidence = min(c.confidence + bonus, 1.0)

    # Step 4: Floor filter
    pre_floor_count = len(ctx.candidates)
    ctx.candidates = [
        c for c in ctx.candidates
        if c.confidence >= signals.get(c.skill_id, {}).get(
            "confidence_floor", DEFAULT_CONFIDENCE_FLOOR
        )
    ]
    below_floor_removed = pre_floor_count - len(ctx.candidates)

    # Step 5: Sort descending, cap at MAX_SKILLS
    ctx.candidates.sort(key=lambda c: c.confidence, reverse=True)
    if len(ctx.candidates) > MAX_SKILLS:
        ctx.candidates = ctx.candidates[:MAX_SKILLS]

    # Populate final fields
    ctx.final_skills = [c.canonical_name for c in ctx.candidates]
    ctx.final_skill_ids = [c.skill_id for c in ctx.candidates]
    ctx.skill_count = len(ctx.candidates)

    duration_ms = int((time.perf_counter() - t0) * 1000)

    ctx.add_stage_result(
        stage="4",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "skills_before_filter":   initial_count,
            "blacklist_removed":       blacklist_removed,
            "dedup_removed":           dedup_removed,
            "type_flag_filtered":      type_filtered,
            "below_floor_removed":     below_floor_removed,
            "skills_after_filter":     len(ctx.candidates),
            "final_count":             ctx.skill_count,
        },
    )

    log.info(
        "Stage 4 OK — before=%d blacklist=-%d dedup=-%d type=-%d floor=-%d final=%d %dms",
        initial_count, blacklist_removed, dedup_removed,
        type_filtered, below_floor_removed, ctx.skill_count, duration_ms,
    )
    return ctx
