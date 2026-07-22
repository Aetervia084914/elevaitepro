"""Stage 3C — Semantic Embedding Similarity (Tertiary Extraction)."""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from app.schemas.skill_normalizer import PipelineContext, SkillCandidate, StageStatus

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

SEMANTIC_BASE_CONFIDENCE: float = 0.65
COSINE_DISTANCE_THRESHOLD: float = 0.18
WINDOW_SIZE: int = 120
WINDOW_STEP: int = 60
MAX_WINDOWS: int = 200
TOP_K_PER_WINDOW: int = 3
MAX_SEMANTIC_CANDIDATES: int = 10


# -- Window builder -----------------------------------------------------------

def _build_unmatched_windows(
    text: str,
    matched_spans: list[tuple[int, int]],
    window_size: int = WINDOW_SIZE,
    window_step: int = WINDOW_STEP,
) -> list[str]:
    """Build sliding windows over unmatched portions of text."""
    matched_positions: set[int] = set()
    for start, end in matched_spans:
        matched_positions.update(range(start, end))

    windows: list[str] = []
    i = 0
    while i + window_size <= len(text) and len(windows) < MAX_WINDOWS:
        window_text = text[i : i + window_size].strip()

        window_positions = set(range(i, i + window_size))
        overlap_ratio = len(window_positions & matched_positions) / max(len(window_positions), 1)

        if overlap_ratio < 0.5 and len(window_text) >= 20:
            windows.append(window_text)

        i += window_step

    return windows


# -- Main entry point ---------------------------------------------------------

async def run_stage3c(
    ctx: PipelineContext,
    conn,
    encoder: "SentenceTransformer",
) -> PipelineContext:
    """Execute Stage 3C: Semantic Embedding Similarity."""
    t0 = time.perf_counter()

    # 3C-1. Build unmatched windows
    windows = _build_unmatched_windows(ctx.raw_text, ctx.matched_spans)

    if not windows:
        log.info("Stage 3C: No unmatched windows to process.")
        ctx.add_stage_result(
            stage="3C",
            status=StageStatus.SKIPPED,
            duration_ms=int((time.perf_counter() - t0) * 1000),
            payload={"windows": 0, "semantic_candidates": 0},
        )
        return ctx

    # 3C-2. Encode windows
    import numpy as np
    from app.services.skill_normalizer.model_singleton import encode_texts

    vectors = encode_texts(windows, encoder)

    existing_skill_ids = {c.skill_id for c in ctx.candidates}
    existing_confidence = {c.skill_id: c.confidence for c in ctx.candidates}
    semantic_count = 0
    total_similarity = 0.0

    # 3C-3. Query pgvector for each window
    for idx, vec in enumerate(vectors):
        vec_str = "[" + ",".join(f"{v:.6f}" for v in vec) + "]"
        cur = await conn.execute(
            """
            SELECT tse.skill_id,
                   ts.canonical_name,
                   tse.embedding <=> %s::vector AS dist
            FROM taxonomy_skill_embeddings tse
            JOIN taxonomy_skills ts USING (skill_id)
            WHERE tse.embedding <=> %s::vector <= %s
            ORDER BY dist
            LIMIT %s
            """,
            (vec_str, vec_str, COSINE_DISTANCE_THRESHOLD, TOP_K_PER_WINDOW),
        )
        rows = await cur.fetchall()

        for skill_id, canonical_name, dist in rows:
            if semantic_count >= MAX_SEMANTIC_CANDIDATES:
                break

            similarity = 1.0 - float(dist)
            confidence = SEMANTIC_BASE_CONFIDENCE

            if skill_id in existing_confidence and existing_confidence[skill_id] >= confidence:
                continue

            ctx.candidates = [c for c in ctx.candidates if c.skill_id != skill_id]

            ctx.candidates.append(SkillCandidate(
                skill_id=skill_id,
                canonical_name=canonical_name,
                source_stage="3C",
                confidence=confidence,
                matched_text=windows[idx][:60],
            ))

            existing_skill_ids.add(skill_id)
            existing_confidence[skill_id] = confidence
            semantic_count += 1
            total_similarity += similarity

        if semantic_count >= MAX_SEMANTIC_CANDIDATES:
            break

    duration_ms = int((time.perf_counter() - t0) * 1000)
    avg_sim = total_similarity / max(semantic_count, 1)

    ctx.add_stage_result(
        stage="3C",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "windows_processed":       len(windows),
            "semantic_candidates":     semantic_count,
            "avg_cosine_similarity":   round(avg_sim, 4),
            "total_candidates":        len(ctx.candidates),
        },
    )

    log.info(
        "Stage 3C OK — windows=%d semantic=%d avg_sim=%.3f total=%d %dms",
        len(windows), semantic_count, avg_sim, len(ctx.candidates), duration_ms,
    )
    return ctx
