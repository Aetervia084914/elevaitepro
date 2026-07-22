"""Centralized AWS Secrets Manager loader for the backend service.

Fetches the application secret once at startup, validates required keys,
and caches the result in memory.  No Secrets Manager calls occur during
normal HTTP request handling.
"""
from __future__ import annotations

import json
import logging
import sys

import boto3
from botocore.exceptions import BotoCoreError, ClientError


logger = logging.getLogger(__name__)

_SECRET_NAME = "elevaiteprosecret"
_AWS_REGION = "eu-west-2"

_REQUIRED_KEYS: frozenset[str] = frozenset(
    {
        "DATABASE_URL",
        "FASTAPI_HOST",
        "FASTAPI_PORT",
        "OPENAI_API_KEY",
        "LLM_BASE_URL",
        "LLM_ENDPOINT",
        "LLM_MODEL",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_USE_TLS",
        "SMTP_FROM_NAME",
        "MAIL_FROM",
        "MAIL_TO",
        "EMAIL_VERIFICATION_SECRET",
        "EMAIL_VERIFICATION_EXPIRY_HOURS",
        "FRONTEND_BASE_URL",
        "VERIFICATION_ENCRYPTION_KEY",
        "VERIFICATION_PEPPER",
        "STRIPE_PUBLIC_KEY",
        "STRIPE_SECRET_KEY",
    }
)

_cache: dict[str, str] | None = None


def get_secrets() -> dict[str, str]:
    """Return the cached secret dict, fetching from AWS on first call.

    Raises ``SystemExit`` if the secret cannot be retrieved or required
    keys are missing — the application must not start with incomplete
    configuration.
    """
    global _cache
    if _cache is not None:
        return _cache

    try:
        client = boto3.client(
            "secretsmanager",
            region_name=_AWS_REGION,
        )
        response = client.get_secret_value(SecretId=_SECRET_NAME)
        secret_string = response["SecretString"]
        secrets: dict[str, str] = json.loads(secret_string)
    except (BotoCoreError, ClientError) as exc:
        logger.critical(
            "Failed to retrieve secret '%s' from AWS Secrets Manager: %s",
            _SECRET_NAME,
            exc,
        )
        sys.exit(1)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.critical(
            "Secret '%s' is not valid JSON: %s",
            _SECRET_NAME,
            exc,
        )
        sys.exit(1)

    missing = _REQUIRED_KEYS - secrets.keys()
    if missing:
        logger.critical(
            "Secret '%s' is missing required keys: %s",
            _SECRET_NAME,
            ", ".join(sorted(missing)),
        )
        sys.exit(1)

    _cache = secrets
    logger.info(
        "Successfully loaded secret '%s' (%d keys)",
        _SECRET_NAME,
        len(secrets),
    )
    return _cache
