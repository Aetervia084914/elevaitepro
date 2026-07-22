"""Stage 1 — File Upload, Format Detection & Cache Check."""
from __future__ import annotations

import hashlib
import logging
import time

from app.schemas.skill_normalizer import FileFormat, PipelineContext, StageStatus
from app.services.skill_normalizer.redis_cache import cache_get

log = logging.getLogger(__name__)

MAX_FILE_SIZE: int = 10 * 1024 * 1024   # 10 MB

# MIME -> FileFormat mapping (magic bytes detected by python-magic)
_MIME_MAP: dict[str, FileFormat] = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileFormat.DOCX,
    "application/msword": FileFormat.DOC,
    "application/pdf": FileFormat.PDF,
    "application/vnd.oasis.opendocument.text": FileFormat.ODT,
    "application/vnd.oasis.opendocument.spreadsheet": FileFormat.ODS,
    "text/plain": FileFormat.TXT,
    "application/zip": FileFormat.DOCX,
    "application/x-ole-storage": FileFormat.DOC,
}

# Extension -> FileFormat fallback
_EXT_MAP: dict[str, FileFormat] = {
    ".docx": FileFormat.DOCX,
    ".doc":  FileFormat.DOC,
    ".pdf":  FileFormat.PDF,
    ".odt":  FileFormat.ODT,
    ".ods":  FileFormat.ODS,
    ".txt":  FileFormat.TXT,
}


class FileValidationError(Exception):
    """Raised when the uploaded file fails Stage 1 validation."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _detect_format(file_bytes: bytes, filename: str) -> FileFormat:
    """Detect file format using python-magic first, fall back to extension."""
    mime = ""
    try:
        import magic
        mime = magic.from_buffer(file_bytes[:8192], mime=True)
        log.debug("python-magic MIME: %s (file: %s)", mime, filename)
    except Exception as exc:
        log.warning("python-magic failed (%s), falling back to extension.", exc)

    if mime and mime in _MIME_MAP:
        fmt = _MIME_MAP[mime]
        if mime == "application/zip" and filename:
            ext = _get_extension(filename)
            if ext in _EXT_MAP:
                return _EXT_MAP[ext]
        return fmt

    if filename:
        ext = _get_extension(filename)
        if ext in _EXT_MAP:
            log.debug("Using extension fallback: %s -> %s", ext, _EXT_MAP[ext].value)
            return _EXT_MAP[ext]

    raise FileValidationError(
        f"Unsupported file format (MIME: {mime!r}, filename: {filename!r}). "
        f"Accepted: .docx, .doc, .pdf, .odt, .ods, .txt"
    )


def _get_extension(filename: str) -> str:
    """Extract lowercase extension including the dot."""
    idx = filename.rfind(".")
    if idx == -1:
        return ""
    return filename[idx:].lower()


async def run_stage1(
    file_bytes: bytes,
    filename: str,
    redis_client,
) -> PipelineContext:
    """Execute Stage 1 of the pipeline."""
    t0 = time.perf_counter()

    ctx = PipelineContext()

    # 1a. File size check
    ctx.file_size_bytes = len(file_bytes)
    if ctx.file_size_bytes == 0:
        raise FileValidationError("Empty file uploaded.")
    if ctx.file_size_bytes > MAX_FILE_SIZE:
        raise FileValidationError(
            f"File too large ({ctx.file_size_bytes:,} bytes). "
            f"Maximum allowed: {MAX_FILE_SIZE:,} bytes (10 MB)."
        )

    # 1b. Format detection
    ctx.file_format = _detect_format(file_bytes, filename)

    # 1c. Content hash (SHA-256)
    ctx.content_hash = hashlib.sha256(file_bytes).hexdigest()

    # 1d. Redis cache check
    cached_skills = await cache_get(redis_client, ctx.content_hash)
    if cached_skills is not None:
        ctx.cache_hit = True
        ctx.final_skills = cached_skills
        ctx.skill_count = len(cached_skills)
        log.info(
            "Stage 1 CACHE HIT — request_id=%s hash=%s skills=%d",
            ctx.request_id, ctx.content_hash[:12], ctx.skill_count,
        )

    duration_ms = int((time.perf_counter() - t0) * 1000)

    # 1e. Audit
    ctx.add_stage_result(
        stage="1",
        status=StageStatus.OK,
        duration_ms=duration_ms,
        payload={
            "file_format":     ctx.file_format.value,
            "file_size_bytes": ctx.file_size_bytes,
            "content_hash":    ctx.content_hash,
            "cache_hit":       ctx.cache_hit,
        },
    )

    log.info(
        "Stage 1 OK — request_id=%s format=%s size=%d hash=%s cache=%s %dms",
        ctx.request_id, ctx.file_format.value, ctx.file_size_bytes,
        ctx.content_hash[:12], ctx.cache_hit, duration_ms,
    )
    return ctx
