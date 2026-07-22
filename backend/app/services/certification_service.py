"""
Certification Normalization Service

Orchestrates the 5-stage certification alias matching pipeline:
  Stage 1: File ingestion & text extraction
  Stage 2: Text normalization
  Stage 3: Alias index (loaded at startup via app.state)
  Stage 4: Alias detection (exact / normalized / fuzzy)
  Stage 5: Response assembly & deduplication
"""
from __future__ import annotations

import logging
import time
from uuid import UUID

from fastapi import Request
from fastapi.responses import ORJSONResponse

from app.core.async_db import get_async_conn, get_async_pool
from app.services.certification_pipeline.stage1_ingest import stage1_file_ingest
from app.services.certification_pipeline.stage2_normalize import stage2_normalize
from app.services.certification_pipeline.stage3_alias_index import stage3_load_and_build
from app.services.certification_pipeline.section_extractor import extract_certification_section
from app.services.certification_pipeline.stage4_matching import stage4_detect
from app.services.certification_pipeline.stage5_response import stage5_assemble
from app.services.certification_pipeline import session_writer

logger = logging.getLogger(__name__)


async def load_alias_index(app_state) -> None:
    """
    Load Stage 3 alias index + automaton into app.state at startup.
    Called from the application lifespan.
    """
    try:
        pool = get_async_pool()
        s3 = await stage3_load_and_build(pool)
        app_state.cert_alias_automaton = s3.automaton
        app_state.cert_alias_automaton_norm = s3.automaton_norm
        app_state.cert_alias_index = s3.alias_index
        app_state.cert_norm_index = s3.norm_index
        app_state.cert_alias_cert_map = s3.alias_cert_map
        app_state.cert_name_automaton = s3.cert_name_automaton
        app_state.cert_name_index = s3.cert_name_index
        app_state.cert_name_cert_map = s3.cert_name_cert_map
        app_state.cert_alias_token_whitelist = s3.alias_token_whitelist
        app_state.cert_stage3_output = s3.stageoutput
        logger.info(
            "Certification Stage 3: %d aliases loaded, automaton ready",
            s3.stageoutput.get("deduped_alias_count", 0),
        )
    except Exception:
        logger.exception("Certification Stage 3 FAILED — alias matching will not work")
        app_state.cert_alias_automaton = None
        app_state.cert_alias_automaton_norm = None
        app_state.cert_alias_index = {}
        app_state.cert_norm_index = {}
        app_state.cert_alias_cert_map = {}
        app_state.cert_name_automaton = None
        app_state.cert_name_index = {}
        app_state.cert_name_cert_map = {}
        app_state.cert_alias_token_whitelist = set()
        app_state.cert_stage3_output = {"error": "failed to load aliases"}


async def reload_alias_index(app_state) -> dict:
    """
    Re-fetch aliases from DB and rebuild automaton.
    Returns summary dict with alias_count and rebuild_ms.
    """
    t0 = time.perf_counter()
    pool = get_async_pool()
    s3 = await stage3_load_and_build(pool)
    app_state.cert_alias_automaton = s3.automaton
    app_state.cert_alias_automaton_norm = s3.automaton_norm
    app_state.cert_alias_index = s3.alias_index
    app_state.cert_norm_index = s3.norm_index
    app_state.cert_alias_cert_map = s3.alias_cert_map
    app_state.cert_name_automaton = s3.cert_name_automaton
    app_state.cert_name_index = s3.cert_name_index
    app_state.cert_name_cert_map = s3.cert_name_cert_map
    app_state.cert_alias_token_whitelist = s3.alias_token_whitelist
    app_state.cert_stage3_output = s3.stageoutput
    rebuild_ms = int((time.perf_counter() - t0) * 1000)
    return {
        "alias_count": s3.stageoutput.get("deduped_alias_count", 0),
        "rebuild_ms": rebuild_ms,
    }


async def run_match_pipeline(
    request: Request,
    file_data: bytes,
    filename: str,
    content_type: str | None,
    fuzzy: bool = False,
    min_confidence: float = 0.0,
) -> dict:
    """
    Execute the full 5-stage certification matching pipeline.
    Returns the final response dict.
    """
    pipeline_start = time.perf_counter()
    state = request.app.state

    # ── Stage 1: File Ingestion ──
    s1 = await stage1_file_ingest(file_data, filename, content_type)

    request_id = s1.request_id
    content_hash = s1.content_hash

    # Handle cache hit
    if s1.stageoutput.get("cache_hit"):
        return s1.stageoutput["cached_response"]

    # Write session + stage 1 to DB
    async with get_async_conn() as conn:
        await session_writer.create_session(
            conn,
            session_id=UUID(request_id),
            content_hash=content_hash,
            file_format=s1.file_format,
            file_size_bytes=s1.file_size_bytes,
        )

        await session_writer.write_stage(
            conn,
            session_id=UUID(request_id),
            stage_number=1,
            stage_name="stage_1_file_ingestion",
            status="success",
            execution_time_ms=s1.stageoutput.get("execution_ms", 0),
            stageoutput=s1.stageoutput,
        )

    # ── Stage 2: Text Normalization (with alias token whitelist from Stage 3) ──
    alias_tokens = getattr(state, "cert_alias_token_whitelist", set())
    s2 = await stage2_normalize(s1.raw_text, alias_tokens=alias_tokens)

    async with get_async_conn() as conn:
        await session_writer.write_stage(
            conn,
            session_id=UUID(request_id),
            stage_number=2,
            stage_name="stage_2_normalization",
            status="success",
            execution_time_ms=s2.stageoutput.get("execution_ms", 0),
            stageoutput=s2.stageoutput,
        )

    # ── Stage 3: Record alias automaton state (built at startup) ──
    s3_meta = getattr(state, "cert_stage3_output", {})
    async with get_async_conn() as conn:
        await session_writer.write_stage(
            conn,
            session_id=UUID(request_id),
            stage_number=3,
            stage_name="stage_3_alias_index",
            status="success" if state.cert_alias_automaton else "error",
            execution_time_ms=s3_meta.get("execution_ms", 0),
            stageoutput=s3_meta,
        )

    # ── Section Extraction: Isolate certification section for alias matching ──
    cert_section_text, cert_section_start, _cert_section_end = extract_certification_section(s2.cleaned_text)

    # ── Stage 4: Alias Detection (cert section) + Cert Name Detection (full text) ──
    s4 = await stage4_detect(
        cleaned_text=s2.cleaned_text,
        automaton=state.cert_alias_automaton,
        automaton_norm=state.cert_alias_automaton_norm,
        alias_index=state.cert_alias_index,
        norm_index=state.cert_norm_index,
        fuzzy_enabled=fuzzy,
        min_confidence=min_confidence,
        cert_section_text=cert_section_text,
        cert_section_offset=cert_section_start or 0,
        cert_name_automaton=state.cert_name_automaton,
        cert_name_index=state.cert_name_index,
    )

    async with get_async_conn() as conn:
        await session_writer.write_stage(
            conn,
            session_id=UUID(request_id),
            stage_number=4,
            stage_name="stage_4_alias_detection",
            status="success",
            execution_time_ms=s4.stageoutput.get("execution_ms", 0),
            stageoutput=s4.stageoutput,
        )

    # ── Stage 5: Result Merge, Deduplication & JSON Response Assembly ──
    elapsed_ms = int((time.perf_counter() - pipeline_start) * 1000)

    s5 = await stage5_assemble(
        request_id=request_id,
        content_hash=content_hash,
        s1_meta=s1.stageoutput,
        s2_meta=s2.stageoutput,
        s3_meta=s3_meta,
        s4=s4,
        fuzzy_enabled=fuzzy,
        processing_ms=elapsed_ms,
        alias_cert_map={**state.cert_alias_cert_map, **state.cert_name_cert_map},
        db_pool=get_async_pool(),
    )

    s5_output = s5["stageoutput"]
    response_dict = s5["response"]

    async with get_async_conn() as conn:
        await session_writer.write_stage(
            conn,
            session_id=UUID(request_id),
            stage_number=5,
            stage_name="stage_5_response_assembly",
            status="success",
            execution_time_ms=s5_output.get("execution_ms", 0),
            stageoutput=s5_output,
        )

    # Finalize session
    total_found = response_dict.get("total_found", 0)
    final_ms = int((time.perf_counter() - pipeline_start) * 1000)
    response_dict["meta"]["processing_ms"] = final_ms

    async with get_async_conn() as conn:
        await session_writer.complete_session(
            conn,
            session_id=UUID(request_id),
            alias_count=total_found,
            processing_ms=final_ms,
        )

    return response_dict
