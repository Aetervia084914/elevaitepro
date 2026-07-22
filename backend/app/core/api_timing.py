"""Shared helper to record API execution time in the ``apiresponse`` table.

Usage — as a background task (fire-and-forget, non-blocking):

    from app.core.api_timing import record_api_time

    background_tasks.add_task(record_api_time, "/uploadresume", elapsed_ms)

Or directly (awaitable):

    await record_api_time("/uploadresume", elapsed_ms, status="success")
"""
from __future__ import annotations

import logging
import time

from app.core.async_db import get_async_conn

logger = logging.getLogger(__name__)

_INSERT_SQL = """
    INSERT INTO public.apiresponse (api_name, time_taken_ms, status)
    VALUES (%s, %s, %s)
"""


async def record_api_time(
    api_name: str,
    time_taken_ms: float,
    status: str = "success",
) -> None:
    """Insert a row into ``apiresponse``.  Non-fatal — logs on failure."""
    try:
        async with get_async_conn() as conn:
            await conn.execute(_INSERT_SQL, (api_name, round(time_taken_ms, 2), status))
            await conn.commit()
        logger.debug("apiresponse: %s %s %.1fms", api_name, status, time_taken_ms)
    except Exception:
        logger.warning("Failed to record api timing for %s (non-fatal)", api_name, exc_info=True)
