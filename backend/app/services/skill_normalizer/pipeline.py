"""Skill normalizer pipeline orchestration and DB persistence helpers."""
from __future__ import annotations

import json
import logging
import time
import orjson
from fastapi import Depends, HTTPException, Request, UploadFile

from app.schemas.skill_normalizer import (
    ExtractionMethod,
    ExtractSkillsResponse,
    PipelineContext,
    SkillCandidate,
    StageStatus,
    compute_best_match,
)
from app.services.skill_normalizer.stage1_ingest import FileValidationError, run_stage1
from app.services.skill_normalizer.stage2_extract import (
    TextExtractionError,
    UnsupportedLanguageError,
    run_stage2,
)
from app.services.skill_normalizer.stage3a_exact import run_stage3a
from app.services.skill_normalizer.stage3b_phrase import run_stage3b
from app.services.skill_normalizer.stage4_score import run_stage4
from app.services.skill_normalizer.stage7_profile import run_stage7_profile
from app.services.skill_normalizer.llm_client import extract_skills_llm

log = logging.getLogger(__name__)


# -- DB persistence helpers ---------------------------------------------------

async def _create_session(conn, ctx: PipelineContext) -> None:
    """Insert a row into the sessions table and store its id as ctx.session_id."""
    try:
        cur = await conn.execute(
            """
            INSERT INTO sessions
                (content_hash, file_format, file_size_bytes, pipeline_status)
            VALUES (%s, %s, %s, 'started')
            RETURNING id
            """,
            (
                ctx.content_hash,
                ctx.file_format.value if ctx.file_format else "unknown",
                ctx.file_size_bytes,
            ),
        )
        row = await cur.fetchone()
        ctx.session_id = row[0]
        await conn.commit()
    except Exception:
        log.exception("Failed to create session row — request_id=%s", ctx.request_id)


async def _finalise_session(conn, ctx: PipelineContext, error: str | None = None) -> None:
    """Update the sessions row with final pipeline status and timing."""
    if ctx.session_id is None:
        return
    try:
        await conn.execute(
            """
            UPDATE sessions
            SET pipeline_status = %s,
                alias_count = %s,
                completed_at = now(),
                error_message = %s
            WHERE id = %s
            """,
            (
                "error" if error else "completed",
                ctx.skill_count,
                error,
                ctx.session_id,
            ),
        )
        await conn.commit()
    except Exception:
        log.exception("Failed to finalise session — session_id=%s", ctx.session_id)


async def _persist_stage_results(conn, ctx: PipelineContext) -> None:
    """Write all accumulated stage_result rows to the stage_results table."""
    if not ctx.stage_results or ctx.session_id is None:
        return
    try:
        for sr in ctx.stage_results:
            await conn.execute(
                """
                INSERT INTO stage_results
                    (session_id, stage_number, stage_name, status,
                     execution_time_ms, stageoutput, error_message,
                     extraction_type)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s)
                """,
                (
                    ctx.session_id,
                    sr.stage_number,
                    sr.stage_name,
                    sr.status.value,
                    sr.duration_ms,
                    orjson.dumps(sr.payload).decode(),
                    sr.error_message,
                    sr.extraction_type,
                ),
            )
        await conn.commit()
    except Exception:
        log.exception("Failed to persist stage_results rows — request_id=%s", ctx.request_id)


async def _persist_profile(conn, ctx: PipelineContext) -> None:
    """Write Stage 7 profile results to skill_profile_detections."""
    if not ctx.industries and not ctx.job_level:
        return
    try:
        await conn.execute(
            """
            INSERT INTO skill_profile_detections
                (request_id, industries, occupation_groups,
                 job_level, job_level_confidence, job_level_onet_avg,
                 job_level_evidence)
            VALUES (%s, %s::jsonb, %s::jsonb, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (
                ctx.request_id,
                orjson.dumps([i.model_dump() for i in ctx.industries]).decode(),
                orjson.dumps([o.model_dump() for o in ctx.occupation_groups]).decode(),
                ctx.job_level.level if ctx.job_level else None,
                ctx.job_level.confidence if ctx.job_level else None,
                ctx.job_level.onet_avg if ctx.job_level else None,
                ctx.job_level.evidence_skills if ctx.job_level else [],
            ),
        )
        await conn.commit()
    except Exception:
        log.exception("Failed to persist skill_profile_detections — request_id=%s", ctx.request_id)


async def _persist_skill_detections(conn, ctx: PipelineContext) -> None:
    """Write final results to skill_detections + skill_detection_trace tables."""
    if not ctx.final_skills:
        return
    try:
        await conn.execute(
            """
            INSERT INTO skill_detections
                (request_id, content_hash, file_format, detected_language,
                 skills, skill_ids, extraction_method, skill_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (request_id) DO UPDATE SET
                 skills = EXCLUDED.skills,
                 skill_ids = EXCLUDED.skill_ids,
                 extraction_method = EXCLUDED.extraction_method,
                 skill_count = EXCLUDED.skill_count,
                 completed_at = now()
            """,
            (
                ctx.request_id,
                ctx.content_hash,
                ctx.file_format.value if ctx.file_format else None,
                ctx.detected_language or "en",
                ctx.final_skills,
                ctx.final_skill_ids,
                ctx.final_method.value,
                ctx.skill_count,
            ),
        )
        final_set = set(ctx.final_skills)
        for c in ctx.candidates:
            accepted = c.canonical_name in final_set
            await conn.execute(
                """
                INSERT INTO skill_detection_trace
                    (request_id, skill_id, source_stage, matched_text,
                     confidence, accepted, reject_reason)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ctx.request_id,
                    c.skill_id,
                    c.source_stage,
                    c.matched_text[:200] if c.matched_text else None,
                    c.confidence,
                    accepted,
                    None if accepted else "below_floor_or_capped",
                ),
            )
        await conn.commit()
    except Exception:
        log.exception("Failed to persist skill_detections — request_id=%s", ctx.request_id)


# -- Full pipeline execution --------------------------------------------------

async def run_extract_skills_pipeline(
    file: UploadFile,
    request: Request,
    conn,
    redis_client,
) -> ExtractSkillsResponse:
    """
    Full pipeline execution for POST /extract-skills.

    Pipeline: Stage 1 (ingest) -> 2 (extract) -> 3A (exact) -> 3B (phrase)
    -> 3C (semantic) -> 4 (score) -> 5 (LLM fallback) -> 6 (persist) -> 7 (profile)
    """
    t0 = time.perf_counter()

    # Read file bytes
    file_bytes = await file.read()
    filename = file.filename or ""

    # Stage 1: File Upload, Format Detection & Cache Check
    try:
        ctx = await run_stage1(file_bytes, filename, redis_client)
    except FileValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)

    # Short-circuit on cache hit — still run Stage 7 for profile enrichment
    if ctx.cache_hit:
        # Extract raw text so Stage 7 title-based industry detection works
        try:
            ctx = await run_stage2(ctx, file_bytes)
        except Exception:
            pass  # non-fatal: Stage 7 will just skip title boost

        if not ctx.final_skill_ids and ctx.final_skills:
            cur = await conn.execute(
                """SELECT skill_ids FROM skill_detections
                   WHERE content_hash = %s
                   ORDER BY completed_at DESC LIMIT 1""",
                (ctx.content_hash,),
            )
            row = await cur.fetchone()
            if row and row[0]:
                ctx.final_skill_ids = row[0]
                ctx.candidates = [
                    SkillCandidate(skill_id=sid, canonical_name=name,
                                   source_stage="cache", confidence=0.9)
                    for sid, name in zip(ctx.final_skill_ids, ctx.final_skills)
                ]
        ctx = await run_stage7_profile(ctx, conn)
        await _persist_profile(conn, ctx)
        best_match = compute_best_match(
            ctx.industries, ctx.occupation_groups, ctx.job_level,
        )
        return ExtractSkillsResponse(
            skills=ctx.final_skills,
            request_id=ctx.request_id,
            skill_count=ctx.skill_count,
            extraction_method="deterministic",
            cache_hit=True,
            best_match=best_match,
            industries=ctx.industries,
            occupation_groups=ctx.occupation_groups,
            job_level=ctx.job_level,
        )

    # Create session row (satisfies stage_results FK)
    await _create_session(conn, ctx)

    # Stage 2: Document -> Raw Text Extraction
    try:
        ctx = await run_stage2(ctx, file_bytes)
    except UnsupportedLanguageError as exc:
        await _finalise_session(conn, ctx, error=f"UNSUPPORTED_LANGUAGE:{exc.detected}")
        await _persist_stage_results(conn, ctx)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "UNSUPPORTED_LANGUAGE",
                "detected_language": exc.detected,
                "message": str(exc),
                "request_id": str(ctx.request_id),
            },
        )
    except TextExtractionError as exc:
        ctx.add_stage_result(
            stage="2",
            status=StageStatus.ERROR,
            error_message=str(exc),
            duration_ms=int((time.perf_counter() - t0) * 1000),
        )
        await _finalise_session(conn, ctx, error=str(exc))
        await _persist_stage_results(conn, ctx)
        raise HTTPException(status_code=422, detail=str(exc))

    # Stage 3A: Exact Match + Alias Resolution
    ctx = await run_stage3a(ctx, conn)

    # Stage 3B: Phrase Pattern Matching
    phrase_patterns = request.app.state.phrase_patterns
    ctx = await run_stage3b(ctx, conn, phrase_patterns)

    # Stage 3C: Semantic Embedding Similarity — skipped (encoder removed)
    log.info("Stage 3C SKIPPED — sentence-transformer encoder removed")

    # Stage 4: Confidence Scoring, Dedup & Demand Signal Boost
    blacklist = request.app.state.blacklist
    ctx = await run_stage4(ctx, conn, blacklist)

    # Stage 5: LLM Fallback (conditional: < 3 skills detected)
    if ctx.skill_count < 3:
        log.info(
            "Stage 5 triggered — only %d skills from deterministic pipeline.",
            ctx.skill_count,
        )
        t5 = time.perf_counter()
        try:
            top_skills = request.app.state.top_skills
            llm_skills = await extract_skills_llm(ctx.raw_text, top_skills)

            if llm_skills:
                cur = await conn.execute(
                    """SELECT skill_id, canonical_name
                       FROM taxonomy_skills
                       WHERE lower(canonical_name) = ANY(%s)""",
                    ([s.lower() for s in llm_skills],),
                )
                llm_rows = await cur.fetchall()
                existing_ids = {c.skill_id for c in ctx.candidates}

                for sid, cname in llm_rows:
                    if sid not in existing_ids:
                        ctx.candidates.append(SkillCandidate(
                            skill_id=sid,
                            canonical_name=cname,
                            source_stage="5_llm",
                            confidence=0.75,
                            matched_text="LLM extraction",
                        ))
                        existing_ids.add(sid)

                # Re-run Stage 4 scoring with merged candidates
                ctx.final_skills = []
                ctx.final_skill_ids = []
                ctx.skill_count = 0
                ctx = await run_stage4(ctx, conn, blacklist)
                ctx.final_method = ExtractionMethod.LLM_FALLBACK

            ctx.add_stage_result(
                stage="5",
                status=StageStatus.OK,
                duration_ms=int((time.perf_counter() - t5) * 1000),
                payload={
                    "llm_triggered":    True,
                    "llm_skill_count":  len(llm_skills),
                    "merged_skill_count": ctx.skill_count,
                },
            )
        except Exception as exc:
            log.error("Stage 5 LLM fallback failed: %s", exc)
            ctx.add_stage_result(
                stage="5",
                status=StageStatus.ERROR,
                duration_ms=int((time.perf_counter() - t5) * 1000),
                error_message=str(exc),
                payload={"llm_triggered": True},
            )
    else:
        ctx.add_stage_result(
            stage="5",
            status=StageStatus.SKIPPED,
            duration_ms=0,
            payload={"llm_triggered": False, "skill_count": ctx.skill_count},
        )

    # Stage 6: Validation, Persistence & Cache
    t6 = time.perf_counter()

    validation_errors = 0
    valid_candidates = [c for c in ctx.candidates if c.skill_id and c.canonical_name]
    if len(valid_candidates) != len(ctx.candidates):
        validation_errors = len(ctx.candidates) - len(valid_candidates)
        ctx.candidates = valid_candidates
        ctx.final_skills = [c.canonical_name for c in ctx.candidates]
        ctx.final_skill_ids = [c.skill_id for c in ctx.candidates]
        ctx.skill_count = len(ctx.candidates)

    await _persist_skill_detections(conn, ctx)

    ctx.add_stage_result(
        stage="6",
        status=StageStatus.OK,
        duration_ms=int((time.perf_counter() - t6) * 1000),
        payload={
            "final_skill_count":  ctx.skill_count,
            "validation_errors":  validation_errors,
            "extraction_method":  ctx.final_method.value,
            "cached":             True,
        },
    )

    total_ms = int((time.perf_counter() - t0) * 1000)

    # Stage 7: Industry, Occupation Group & Job Level Profiling
    ctx = await run_stage7_profile(ctx, conn)
    await _persist_profile(conn, ctx)

    best_match = compute_best_match(
        ctx.industries, ctx.occupation_groups, ctx.job_level,
    )

    response = ExtractSkillsResponse(
        skills=ctx.final_skills,
        request_id=ctx.request_id,
        skill_count=ctx.skill_count,
        extraction_method=ctx.final_method.value,
        cache_hit=ctx.cache_hit,
        best_match=best_match,
        industries=ctx.industries,
        occupation_groups=ctx.occupation_groups,
        job_level=ctx.job_level,
    )

    # Stage "output": persist the full API response into stage_results
    ctx.add_stage_result(
        stage="output",
        status=StageStatus.OK,
        duration_ms=total_ms,
        payload=orjson.loads(response.model_dump_json()),
    )

    # Persist all stage_results rows (including output) and mark session complete
    await _persist_stage_results(conn, ctx)
    await _finalise_session(conn, ctx)

    log.info(
        "Pipeline complete — request_id=%s skills=%d level=%s method=%s total=%dms",
        ctx.request_id, ctx.skill_count,
        ctx.job_level.level if ctx.job_level else "?",
        ctx.final_method.value, total_ms,
    )

    return response
