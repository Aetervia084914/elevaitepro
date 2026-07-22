from collections.abc import Generator
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


settings = get_settings()

if settings.rds_ca_path:
    ca_path = Path(settings.rds_ca_path).resolve()
else:
    ca_path = Path(__file__).resolve().parents[2] / "certs" / "global-bundle.pem"

is_rds = urlparse(settings.database_url).hostname not in (None, "localhost", "127.0.0.1")

connect_args = {}
if is_rds and ca_path.exists():
    connect_args["sslmode"] = "verify-full"
    connect_args["sslrootcert"] = str(ca_path)

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()