"""Async PostgreSQL connection pool shared by certification and skill normalizer pipelines."""
from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from psycopg.errors import InsufficientPrivilege
from psycopg_pool import AsyncConnectionPool

from app.core.config import get_settings
from app.core.logging import get_logger


# Psycopg async requires SelectorEventLoop on Windows. Some scripts import this
# module directly (bypassing run.py / app.main), so enforce the policy here too.
if sys.platform == "win32":
    current_policy = asyncio.get_event_loop_policy()
    if not isinstance(current_policy, asyncio.WindowsSelectorEventLoopPolicy):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logger = get_logger(__name__)

SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "certification_schema.sql"
TOOL_MASTER_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "tool_master_schema.sql"
APIRESPONSE_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "apiresponse_schema.sql"
ROLE_ANALYSES_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "migrations" / "add_role_analyses_table.sql"
EMAIL_VERIFIED_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "migrations" / "add_email_verified_column.sql"
USER_CV_UPLOAD_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "migrations" / "create_user_cv_upload_table.sql"
USERCOMPLETEDGAPS_SCHEMA_PATH: Path = Path(__file__).resolve().parent.parent / "db" / "migrations" / "create_usercompletedgaps_table.sql"

_pool: AsyncConnectionPool | None = None


def _get_psycopg_url() -> str:
    """Convert SQLAlchemy-style DATABASE_URL to plain psycopg conninfo."""
    url = get_settings().database_url
    if "+psycopg" in url:
        url = url.replace("+psycopg", "")
    # Force IPv4 loopback — "localhost" can resolve to ::1 first on Windows,
    # which hangs (rather than fails fast) if Postgres only listens on IPv4.
    url = url.replace("://localhost:", "://127.0.0.1:")
    return url


async def init_async_pool() -> None:
    """Create the async connection pool and run schema bootstrap."""
    global _pool
    conninfo = _get_psycopg_url()
    _pool = AsyncConnectionPool(
        conninfo=conninfo,
        min_size=2,
        max_size=10,
        open=False,
        kwargs={"connect_timeout": 10},  # fail fast instead of hanging to the 30s pool timeout
    )
    await _pool.open(wait=True)
    logger.info("Async psycopg pool opened — %s", conninfo.split("@")[-1])
    await _run_schema()


async def close_async_pool() -> None:
    """Gracefully close the pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Async psycopg pool closed")


async def _run_schema() -> None:
    """Execute schema DDL files to ensure tables exist."""
    for path in (SCHEMA_PATH, TOOL_MASTER_SCHEMA_PATH, APIRESPONSE_SCHEMA_PATH, ROLE_ANALYSES_SCHEMA_PATH, EMAIL_VERIFIED_SCHEMA_PATH, USER_CV_UPLOAD_SCHEMA_PATH, USERCOMPLETEDGAPS_SCHEMA_PATH):
        if not path.exists():
            logger.warning("%s not found at %s — skipping", path.name, path)
            continue
        ddl = path.read_text(encoding="utf-8")
        try:
            async with _pool.connection() as conn:  # type: ignore[union-attr]
                await conn.execute(ddl)
                await conn.commit()
            logger.info("%s executed successfully", path.name)
        except InsufficientPrivilege:
            logger.info("%s skipped — tables already exist (owned by another role)", path.name)
        except Exception:
            logger.exception("Failed to execute %s — tables may already exist", path.name)


def get_async_pool() -> AsyncConnectionPool:
    """Return the live pool, raising if not initialised."""
    if _pool is None:
        raise RuntimeError("Async connection pool not initialised — call init_async_pool() first")
    return _pool


@asynccontextmanager
async def get_async_conn():
    """Yield an async connection from the pool."""
    pool = get_async_pool()
    async with pool.connection() as conn:
        yield conn