"""Verification code service — file-system-based encrypted storage.

Generates cryptographically random 6-digit codes, encrypts them with Fernet,
and persists them to the local file system (one JSON file per email).
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import time
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[3]
STORE_DIR = _ROOT / "verification_store"

MAX_ATTEMPTS = 5
CODE_TTL_SECONDS = 120
RATE_LIMIT_SECONDS = 30


def _cfg():
    return get_settings()


_fernet_instance: Fernet | None = None


def _fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    key = _cfg().verification_encryption_key
    if key:
        try:
            _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
            return _fernet_instance
        except Exception:
            logger.warning("Invalid VERIFICATION_ENCRYPTION_KEY, generating a new one")

    generated = Fernet.generate_key()
    logger.warning(
        "VERIFICATION_ENCRYPTION_KEY not set or invalid — using auto-generated key. "
        "Set VERIFICATION_ENCRYPTION_KEY=%s in .env for persistence across restarts.",
        generated.decode(),
    )
    _fernet_instance = Fernet(generated)
    return _fernet_instance


def _safe_filename(email: str) -> str:
    pepper = _cfg().verification_pepper
    digest = hashlib.sha256(f"{email.strip().lower()}:{pepper}".encode()).hexdigest()
    return f"{digest}.json"


def _ensure_store():
    STORE_DIR.mkdir(parents=True, exist_ok=True)


def _file_path(email: str) -> Path:
    return STORE_DIR / _safe_filename(email)


def _read_record(email: str) -> dict | None:
    fp = _file_path(email)
    if not fp.exists():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _write_record(email: str, record: dict) -> None:
    _ensure_store()
    fp = _file_path(email)
    fp.write_text(json.dumps(record), encoding="utf-8")


def _delete_record(email: str) -> None:
    fp = _file_path(email)
    if fp.exists():
        fp.unlink(missing_ok=True)


def generate_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def create_verification(email: str) -> tuple[str, str]:
    """Generate a new verification code for the given email.

    Returns (plain_code, session_token).
    Raises ValueError on rate-limit violation.
    """
    email_lower = email.strip().lower()
    existing = _read_record(email_lower)

    if existing:
        created = existing.get("created_at", 0)
        if time.time() - created < RATE_LIMIT_SECONDS:
            raise ValueError("Please wait before requesting a new code.")

    code = generate_code()
    session_token = secrets.token_urlsafe(32)
    encrypted_code = _fernet().encrypt(code.encode()).decode()
    now = time.time()

    record = {
        "encrypted_code": encrypted_code,
        "email_hash": hashlib.sha256(email_lower.encode()).hexdigest(),
        "session_token": session_token,
        "created_at": now,
        "expires_at": now + CODE_TTL_SECONDS,
        "attempts": 0,
        "locked": False,
    }

    _write_record(email_lower, record)
    return code, session_token


def verify_code(email: str, submitted_code: str) -> tuple[bool, str, str | None]:
    """Verify the submitted code against the stored record.

    Returns (success, message, session_token | None).
    """
    email_lower = email.strip().lower()
    record = _read_record(email_lower)

    if not record:
        return False, "No verification code found. Please request a new one.", None

    if record.get("locked"):
        return False, "Too many failed attempts. Please request a new code.", None

    now = time.time()
    if now > record.get("expires_at", 0):
        _delete_record(email_lower)
        return False, "Verification code has expired. Please request a new one.", None

    record["attempts"] = record.get("attempts", 0) + 1

    if record["attempts"] >= MAX_ATTEMPTS:
        record["locked"] = True
        _write_record(email_lower, record)
        return False, "Too many failed attempts. Please request a new code.", None

    _write_record(email_lower, record)

    try:
        stored_code = _fernet().decrypt(record["encrypted_code"].encode()).decode()
    except InvalidToken:
        return False, "Internal verification error.", None

    if submitted_code.strip() != stored_code:
        remaining = MAX_ATTEMPTS - record["attempts"]
        return False, f"Invalid verification code. {remaining} attempt(s) remaining.", None

    session_token = record.get("session_token")
    _delete_record(email_lower)
    return True, "Email verified successfully.", session_token


def cleanup_expired() -> int:
    """Remove expired verification files. Returns count of files removed."""
    if not STORE_DIR.exists():
        return 0
    removed = 0
    now = time.time()
    for fp in STORE_DIR.glob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            if now > data.get("expires_at", 0):
                fp.unlink(missing_ok=True)
                removed += 1
        except (json.JSONDecodeError, OSError, KeyError):
            fp.unlink(missing_ok=True)
            removed += 1
    return removed
