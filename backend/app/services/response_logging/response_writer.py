"""Pluggable OpenAI response writer.

Writes OpenAI API responses to ``response.json`` (or a timestamped variant)
for any route that needs it.  Designed to be dropped in or removed without
touching the calling code — just add/remove the call to
``write_response_json()``.

Usage
-----
Synchronous (fire-and-forget via BackgroundTasks):

    from app.services.response_logging import write_response_json, ResponseWriterConfig

    cfg = ResponseWriterConfig(
        endpoint="getresume_futureroles",
        session_id=x_session_id,
    )
    background_tasks.add_task(write_response_json, raw_response, parsed_output, cfg)

Direct (blocking, useful for debugging):

    write_response_json(raw_response, parsed_output, cfg)

Environment variables
---------------------
RESPONSE_LOG_ENABLED  — set to "false" or "0" to disable all writing globally.
RESPONSE_LOG_DIR      — directory to write files into (default: ``<repo_root>/response_logs``).
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── Default output directory ──────────────────────────────────────────────────
# Resolved relative to this file: backend/app/services/response_logging → up 4
# levels → backend/, then into response_logs/
_DEFAULT_LOG_DIR = Path(__file__).resolve().parents[4] / "response_logs"


# ── Config dataclass ──────────────────────────────────────────────────────────


@dataclass
class ResponseWriterConfig:
    """All knobs for a single write operation.

    Parameters
    ----------
    endpoint:
        Label used in the file name, e.g. ``"getresume_futureroles"``.
    session_id:
        Optional session identifier embedded in the file name and payload.
    output_dir:
        Directory to write into.  Defaults to the ``RESPONSE_LOG_DIR``
        environment variable, falling back to ``<repo_root>/response_logs``.
    filename_prefix:
        Override the auto-generated file-name prefix.
    timestamped:
        If ``True`` (default) each call creates a new file with a timestamp
        suffix.  If ``False`` the file is always named ``response.json``
        (overwritten on every call).
    include_raw_response:
        Whether to embed the raw OpenAI HTTP response body in the output.
    include_parsed_output:
        Whether to embed the parsed/normalised output in the output.
    enabled:
        Set to ``False`` to skip writing for this specific call only.
    """

    endpoint: str = "openai"
    session_id: str | None = None
    output_dir: Path | str | None = None
    filename_prefix: str | None = None
    timestamped: bool = True
    include_raw_response: bool = True
    include_parsed_output: bool = True
    enabled: bool = True

    # Resolved at runtime — do not set manually.
    _resolved_dir: Path = field(init=False, repr=False, default=None)  # type: ignore[assignment]

    def resolve_dir(self) -> Path:
        if self._resolved_dir is not None:
            return self._resolved_dir

        if self.output_dir is not None:
            self._resolved_dir = Path(self.output_dir)
        else:
            env_dir = os.getenv("RESPONSE_LOG_DIR", "").strip()
            self._resolved_dir = Path(env_dir) if env_dir else _DEFAULT_LOG_DIR

        return self._resolved_dir

    def build_filename(self) -> str:
        prefix = self.filename_prefix or self.endpoint
        if self.timestamped:
            ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            session_part = f"_{self.session_id}" if self.session_id else ""
            return f"{prefix}{session_part}_{ts}.json"
        return "response.json"


# ── Global kill-switch ────────────────────────────────────────────────────────


def _globally_enabled() -> bool:
    """Returns False when ``RESPONSE_LOG_ENABLED=false|0`` is set."""
    val = os.getenv("RESPONSE_LOG_ENABLED", "true").strip().lower()
    return val not in {"false", "0", "no", "off"}


# ── Core writer ───────────────────────────────────────────────────────────────


def write_response_json(
    raw_response: Any,
    parsed_output: Any,
    config: ResponseWriterConfig | None = None,
) -> Path | None:
    """Write the OpenAI response to a JSON file.

    Parameters
    ----------
    raw_response:
        The raw dictionary received directly from ``resp.json()`` (the
        HTTP response body from the OpenAI proxy).
    parsed_output:
        The normalised/parsed output that was returned to the client.
    config:
        A :class:`ResponseWriterConfig` instance.  Uses sensible defaults
        when omitted.

    Returns
    -------
    pathlib.Path | None
        Path to the file that was written, or ``None`` if writing was skipped.
    """
    cfg = config or ResponseWriterConfig()

    # Global or per-call disable
    if not _globally_enabled() or not cfg.enabled:
        logger.debug("[response_writer] Skipped — disabled for endpoint=%r", cfg.endpoint)
        return None

    output_dir = cfg.resolve_dir()
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        logger.warning("[response_writer] Cannot create directory %s: %s", output_dir, exc)
        return None

    file_path = output_dir / cfg.build_filename()

    payload: dict[str, Any] = {
        "endpoint": cfg.endpoint,
        "session_id": cfg.session_id,
        "written_at": datetime.now(timezone.utc).isoformat(),
    }

    if cfg.include_raw_response:
        payload["raw_response"] = raw_response

    if cfg.include_parsed_output:
        payload["parsed_output"] = parsed_output

    try:
        with file_path.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, default=_json_default)
        logger.info(
            "[response_writer] Wrote %s (%d bytes)",
            file_path.name,
            file_path.stat().st_size,
        )
        return file_path
    except OSError as exc:
        logger.warning("[response_writer] Failed to write %s: %s", file_path, exc)
        return None


# ── JSON serialisation fallback ───────────────────────────────────────────────


def _json_default(obj: Any) -> Any:
    """Fallback serialiser for types ``json.dump`` cannot handle."""
    if hasattr(obj, "isoformat"):  # datetime / date
        return obj.isoformat()
    if hasattr(obj, "__dict__"):
        return obj.__dict__
    return str(obj)
