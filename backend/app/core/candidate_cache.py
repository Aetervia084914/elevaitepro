"""Candidate-level in-memory cache (replaces Redis).

DB persistence on logout is kept (sessionactivity table).
Cache entries live in a module-level dict and are cleaned up on logout.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time
import uuid
from typing import Any

logger = logging.getLogger(__name__)

_store: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


# ── Internal helpers ─────────────────────────────────────────────────────────


def _to_json_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)) and not value:
        return None
    return json.dumps(value, default=str)


def _sanitize_role_key(role_name: str) -> str:
    key = role_name.strip().replace(" ", "_").replace("-", "_")
    return re.sub(r"[^A-Za-z0-9_]", "", key)


def _resolve_candidate_id(session_token: str) -> uuid.UUID | None:
    _t = time.perf_counter()
    try:
        from sqlalchemy import text
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            row = db.execute(
                text("SELECT user_id FROM usersession WHERE session_token = :token"),
                {"token": session_token},
            ).fetchone()
            cid = row[0] if row else None
            logger.info(
                "[Cache] DB lookup usersession — token=%s…, candidate_id=%s (%.0fms)",
                session_token[:8], cid, (time.perf_counter() - _t) * 1000,
            )
            return cid
    except Exception as exc:
        logger.error(
            "[Cache] DB lookup usersession FAILED — token=%s…: %s (%.0fms)",
            session_token[:8], exc, (time.perf_counter() - _t) * 1000,
        )
        return None


def _cache_key(candidate_id: uuid.UUID, session_token: str) -> str:
    return f"candidate:{candidate_id}:session_token:{session_token}"


def _key_from_token(session_token: str) -> str | None:
    cid = _resolve_candidate_id(session_token)
    if cid is None:
        return None
    return _cache_key(cid, session_token)


# ── Public API ───────────────────────────────────────────────────────────────


def cache_upload_result(
    session_token: str,
    future_roles_data: dict[str, Any],
    candidate_details: dict[str, Any] | None = None,
) -> bool:
    key = _key_from_token(session_token)
    if key is None:
        logger.warning("[Cache] cache_upload_result — no candidate for token %s…", session_token[:8])
        return False
    doc = {
        "candidate_details": candidate_details or {},
        "future_roles": future_roles_data,
        "Analysis": {},
    }
    with _lock:
        _store[key] = doc
    logger.info("[Cache] cache_upload_result OK — key=%s…", key[:32])
    return True


def cache_analysis_role(
    session_token: str,
    role_name: str,
    role_data: dict[str, Any],
) -> bool:
    key = _key_from_token(session_token)
    if key is None:
        logger.warning("[Cache] cache_analysis_role — no candidate for token %s…", session_token[:8])
        return False
    sanitized = _sanitize_role_key(role_name)
    with _lock:
        if key not in _store:
            _store[key] = {"candidate_details": {}, "future_roles": {}, "Analysis": {}}
        _store[key]["Analysis"][sanitized] = role_data
    logger.info("[Cache] cache_analysis_role OK — key=%s…, role=%s", key[:32], sanitized)
    return True


def persist_and_delete_candidate_cache(session_token: str) -> bool:
    """Persist session data to sessionactivity table on logout, then clear in-memory cache."""
    from datetime import datetime, timezone

    candidate_id = _resolve_candidate_id(session_token)
    if candidate_id is None:
        logger.warning("persist_and_delete: skipped — no candidate for token")
        return False

    cache_key = _cache_key(candidate_id, session_token)

    try:
        from sqlalchemy import text as sa_text
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            db.execute(
                sa_text("""
                    INSERT INTO sessionactivity (
                        id, candidate_id, session_token, cache_key,
                        logged_out_at
                    ) VALUES (
                        gen_random_uuid(), :candidate_id, :session_token, :cache_key,
                        :logged_out_at
                    )
                """),
                {
                    "candidate_id": str(candidate_id),
                    "session_token": session_token,
                    "cache_key": cache_key,
                    "logged_out_at": datetime.now(timezone.utc),
                },
            )
            db.commit()
        logger.info("sessionactivity persisted — candidate=%s token=%s",
                     candidate_id, session_token[:8])
    except Exception as exc:
        logger.warning("sessionactivity persist failed — %s", exc)

    with _lock:
        removed = _store.pop(cache_key, None)
    if removed:
        logger.info("[Cache] in-memory entry deleted — key=%s…", cache_key[:32])

    return True


def delete_candidate_cache(session_token: str) -> bool:
    return persist_and_delete_candidate_cache(session_token)


def get_candidate_cache(
    session_token: str,
    path: str = "$",
) -> Any:
    key = _key_from_token(session_token)
    if key is None:
        return None
    with _lock:
        doc = _store.get(key)
    if doc is None:
        return None
    if path == "$":
        return doc
    parts = path.lstrip("$").strip(".").split(".")
    current: Any = doc
    for part in parts:
        if not part:
            continue
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current


def get_analysed_roles(session_token: str) -> list[str] | None:
    key = _key_from_token(session_token)
    if key is None:
        return []
    with _lock:
        doc = _store.get(key)
    if doc is None:
        return []
    return list(doc.get("Analysis", {}).keys())
