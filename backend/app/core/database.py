from collections.abc import Generator

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.session import engine, get_db_session


logger = get_logger(__name__)


def get_db() -> Generator[Session, None, None]:
    yield from get_db_session()


def check_database_connection() -> tuple[bool, str | None]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, None
    except SQLAlchemyError as exc:
        logger.warning("PostgreSQL health check failed: %s", exc)
        return False, str(exc)
