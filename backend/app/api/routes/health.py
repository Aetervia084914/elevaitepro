from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter

from app.core.database import check_database_connection
from app.schemas.health import HealthResponse


router = APIRouter(tags=["health"])

_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_DB_LOG = _BACKEND_ROOT / "healthlog_db.txt"


def _append_health_log(log_path: Path, service: str, error: str) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    line = f"{timestamp} | ERROR | {service} | {error}\n"
    try:
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    postgres_ok, postgres_error = check_database_connection()

    if postgres_error:
        _append_health_log(_DB_LOG, "POSTGRES", postgres_error)

    return HealthResponse(
        status="ok" if postgres_ok else "degraded",
        postgres="connected" if postgres_ok else "unavailable",
        postgres_error=postgres_error,
    )
