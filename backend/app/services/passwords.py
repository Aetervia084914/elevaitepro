from __future__ import annotations

import base64
import hashlib
import secrets


_ALGORITHM = "pbkdf2_sha256"
_ITERATIONS = 600_000
_SALT_BYTES = 16
_KEY_BYTES = 32


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        _ITERATIONS,
        dklen=_KEY_BYTES,
    )
    return f"{_ALGORITHM}${_ITERATIONS}${_b64encode(salt)}${_b64encode(key)}"


def is_password_hash(value: str | None) -> bool:
    return bool(value and value.startswith(f"{_ALGORITHM}$"))


def verify_password(password: str, stored_password: str | None) -> bool:
    if not stored_password:
        return False

    if not is_password_hash(stored_password):
        return secrets.compare_digest(password, stored_password)

    try:
        algorithm, iterations, salt, expected_key = stored_password.split("$", 3)
        if algorithm != _ALGORITHM:
            return False
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _b64decode(salt),
            int(iterations),
            dklen=_KEY_BYTES,
        )
    except (TypeError, ValueError):
        return False

    return secrets.compare_digest(_b64encode(key), expected_key)


def password_needs_rehash(stored_password: str | None) -> bool:
    if not is_password_hash(stored_password):
        return True

    try:
        _, iterations, _, _ = stored_password.split("$", 3)
        return int(iterations) < _ITERATIONS
    except (TypeError, ValueError):
        return True
