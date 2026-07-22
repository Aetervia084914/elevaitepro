"""API routes for the Tool Extraction pipeline.

Endpoints mirror the tool_normalizer standalone API but run inside the main
backend app, writing ``extraction_type = 'tools'`` to ``stage_results``.
"""
from __future__ import annotations

import asyncio
import logging
from io import BytesIO
from typing import Any, Optional

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile, status
from pydantic import BaseModel, Field

from app.services.tool_normalizer._loader import get
from app.services.tool_normalizer.profiling import profile_from_tools

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tool-normalizer", tags=["tool-normalizer"])


# ── Request / response models (thin wrappers) ────────────────────────────

class RawTextPayload(BaseModel):
    raw_text: str = Field(min_length=1, max_length=20000)
    source: Optional[str] = None


class ToolNormalizerHealthResponse(BaseModel):
    status: str
    pipeline: str = "tool_extraction"
    stages: str = "1-13"
    orchestrator: str
    cache: str


# ── File text extraction helper ──────────────────────────────────────────

async def _extract_text_from_file(file: UploadFile) -> str:
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    data = await file.read()

    # .txt
    if filename.endswith(".txt") or content_type.startswith("text/plain"):
        try:
            return data.decode("utf-8", errors="replace")
        finally:
            await file.close()

    # .pdf via pypdf
    if filename.endswith(".pdf") or content_type == "application/pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(BytesIO(data))
            pages = [p.extract_text() or "" for p in getattr(reader, "pages", [])]
            return "\n".join(pages)
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="PDF support requires 'pypdf'",
            ) from exc
        finally:
            await file.close()

    # .docx via python-docx
    if filename.endswith(".docx") or "wordprocessingml" in content_type:
        try:
            import docx
            document = docx.Document(BytesIO(data))
            return "\n".join(p.text for p in document.paragraphs if p.text)
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="DOCX support requires 'python-docx'",
            ) from exc
        finally:
            await file.close()

    # .ods via odfpy
    if filename.endswith(".ods") or "opendocument.spreadsheet" in content_type:
        try:
            from odf.opendocument import load
            from odf import table, text as odf_text
            doc = load(BytesIO(data))
            cells = []
            for tbl in doc.getElementsByType(table.Table):
                for row in tbl.getElementsByType(table.TableRow):
                    row_cells = []
                    for cell in row.getElementsByType(table.TableCell):
                        ps = cell.getElementsByType(odf_text.P)
                        cell_text = " ".join(
                            str(t.firstChild.data) if getattr(t, "firstChild", None) else ""
                            for t in ps
                        ).strip()
                        if cell_text:
                            row_cells.append(cell_text)
                    if row_cells:
                        cells.append("\t".join(row_cells))
            return "\n".join(cells)
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="ODS support requires 'odfpy'",
            ) from exc
        finally:
            await file.close()

    await file.close()
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Unsupported file type. Allowed: .pdf, .docx, .txt, .ods",
    )


# ── Pipeline execution helper ────────────────────────────────────────────

def _build_request_from_text(raw_text: str) -> dict[str, Any]:
    """Build a minimal FutureRolesRequest-compatible payload from raw text."""
    FutureRolesRequest = get("FutureRolesRequest")
    text = (raw_text or "").strip() or "No content provided"
    req = FutureRolesRequest(
        current_job_title="Unknown",
        years_of_experience="0",
        tools_or_tech="unknown",
        core_skills="unknown",
        work_experience=text[:12000],
        education="unknown",
        location="unknown",
        certification=None,
    )
    return req.model_dump(mode="json")


def _derive_fallbacks(warnings: list[str]) -> list[str]:
    flags: list[str] = []
    lowered = [w.lower() for w in warnings]
    if any("neo4j" in w and "fallback" in w for w in lowered):
        flags.append("neo4j_fallback")
    if any("lexical fallback" in w for w in lowered):
        flags.append("vector_lexical_fallback")
    if any("spacy" in w or "nlp backend" in w for w in lowered):
        flags.append("nlp_fallback")
    return flags


async def _run_pipeline(
    payload: dict[str, Any],
    request: Request,
    response: Response,
    raw_text: str | None = None,
) -> dict:
    """Execute the tool extraction pipeline and return the response dict."""
    orchestrator = getattr(request.app.state, "tn_orchestrator", None)
    if orchestrator is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Tool normalizer is not available — orchestrator failed to initialise",
        )

    cache_service = request.app.state.tn_cache_service
    tn_settings = request.app.state.tn_settings

    # Cache lookup
    request_fingerprint = cache_service.make_fingerprint(payload)
    response.headers["X-Tool-Normalizer-Request-Fingerprint"] = request_fingerprint

    cached_payload, cache_read_status = cache_service.get_json(request_fingerprint)
    if cached_payload is not None:
        response.headers["X-Tool-Normalizer-Cache"] = "hit"
        return cached_payload

    PipelineExecutionError = get("PipelineExecutionError")

    pipeline_timeout = max(120, getattr(tn_settings, "request_timeout_seconds", 600))
    try:
        execution = await asyncio.wait_for(
            asyncio.to_thread(
                orchestrator.execute_detailed, payload, request_fingerprint,
            ),
            timeout=pipeline_timeout,
        )
        fallbacks = _derive_fallbacks(execution.warnings)
        response.headers["X-Tool-Normalizer-Cache"] = (
            cache_read_status if cache_read_status != "miss" else execution.cache_status
        )
        response.headers["X-Tool-Normalizer-Degraded"] = (
            "true" if execution.degraded else "false"
        )
        response.headers["X-Tool-Normalizer-Degraded-Stages"] = ",".join(
            str(s) for s in execution.degraded_stages
        )
        response.headers["X-Tool-Normalizer-Fallbacks"] = (
            ",".join(fallbacks) if fallbacks else "none"
        )
        # Return tool extraction output from Stage 13 (tools/software/technology)
        tool_result = execution.tool_extraction_result
        if tool_result is None:
            tool_result = {"tools": [], "software": [], "technology": [], "categories": []}

        # Post-pipeline profiling: industry, occupation, job level
        engine = getattr(request.app.state, "tn_engine", None)
        if engine is not None:
            try:
                profile = await asyncio.to_thread(
                    profile_from_tools, engine, tool_result, raw_text,
                )
                if profile:
                    tool_result["profile"] = profile
            except Exception:
                logger.warning("Profiling failed — returning tools without profile")

        # Cache the enriched result (tools + categories + profile) in Redis
        try:
            cache_service.set_json(request_fingerprint, tool_result)
            logger.info(
                "Tool cache WRITE — fingerprint=%s tools=%d software=%d technology=%d categories=%d",
                request_fingerprint[:12],
                len(tool_result.get("tools", [])),
                len(tool_result.get("software", [])),
                len(tool_result.get("technology", [])),
                len(tool_result.get("categories", [])),
            )
        except Exception as exc:
            logger.warning("Tool cache write failed (non-fatal): %s", exc)

        return tool_result

    except PipelineExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc),
        ) from exc
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Tool extraction pipeline timed out",
        ) from exc


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/extract-tools")
async def extract_tools_from_file(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
) -> dict:
    """Upload a resume file and extract tools / technologies."""
    raw_text = await _extract_text_from_file(file)
    payload = _build_request_from_text(raw_text)
    return await _run_pipeline(payload, request, response, raw_text=raw_text)


@router.post("/extract-tools-text")
async def extract_tools_from_text(
    body: RawTextPayload,
    request: Request,
    response: Response,
) -> dict:
    """Submit raw resume text and extract tools / technologies."""
    raw_text = (body.raw_text or "").strip()
    payload = {"raw_text": raw_text, "source": (body.source or "").strip() or None}
    return await _run_pipeline(payload, request, response, raw_text=raw_text)


@router.get("/tool-health", response_model=ToolNormalizerHealthResponse)
async def tool_health(request: Request) -> ToolNormalizerHealthResponse:
    """Health check for the tool normalizer pipeline."""
    orchestrator = getattr(request.app.state, "tn_orchestrator", None)
    cache_service = getattr(request.app.state, "tn_cache_service", None)
    return ToolNormalizerHealthResponse(
        status="ok" if orchestrator else "degraded",
        orchestrator="ok" if orchestrator else "unavailable",
        cache="ok" if cache_service and cache_service.is_available() else "unavailable",
    )
