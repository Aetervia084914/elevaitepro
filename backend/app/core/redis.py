"""Redis compatibility stubs — Redis dependency removed.

All functions return safe no-op / empty values so callers continue
to work without any Redis server.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_redis_client():
    return None


def check_redis_connection() -> tuple[bool, str | None]:
    return False, "Redis removed — using database-only caching"


def get_cached_json(key: str) -> dict[str, Any] | None:
    return None


def set_cached_json(key: str, value: dict[str, Any], ttl_seconds: int) -> None:
    pass
