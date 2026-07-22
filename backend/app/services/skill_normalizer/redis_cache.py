"""Skill pipeline cache stubs — Redis dependency removed.

All cache operations are no-ops. The pipeline works without caching;
it simply re-processes each request.
"""
from __future__ import annotations

import logging

from fastapi import Request

log = logging.getLogger(__name__)


async def init_async_redis(app) -> None:
    app.state.redis = None
    log.info("Skill normalizer cache disabled — Redis removed")


async def close_async_redis(app) -> None:
    app.state.redis = None


def get_redis(request: Request):
    return None


async def cache_get(redis_client, content_hash: str) -> list[str] | None:
    return None


async def cache_set(redis_client, content_hash: str, skills: list[str]) -> None:
    pass
