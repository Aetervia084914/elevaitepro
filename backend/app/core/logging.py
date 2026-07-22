import logging
import os
import sys
from pathlib import Path
from typing import Optional


_LOGGING_CONFIGURED = False

# server/logs.txt lives in the project root (parent of backend/)
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_LOG_FILE = _PROJECT_ROOT / "server" / "logs.txt"


def configure_logging(level: str = "INFO") -> None:
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    # Also write to server/logs.txt (shared with Next.js proxy logs)
    try:
        _LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(_LOG_FILE, encoding="utf-8")
        file_handler.setFormatter(logging.Formatter(fmt))
        handlers.append(file_handler)
    except OSError:
        pass  # non-fatal — logs still go to stdout

    logging.basicConfig(
        level=level,
        format=fmt,
        handlers=handlers,
        force=True,
    )
    _LOGGING_CONFIGURED = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name or "app")
