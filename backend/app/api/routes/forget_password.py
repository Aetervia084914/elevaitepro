from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Annotated
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.auth_repository import AuthRepository
from app.services.forget_password import (
    build_reset_url,
    generate_reset_token,
    normalize_frontend_base_url,
    send_reset_email,
    verify_reset_token,
)
from app.core.config import get_settings
from app.services.passwords import hash_password

router = APIRouter(prefix="/forget_password", tags=["forget_password"])
logger = logging.getLogger(__name__)

# In-memory rate limiter: email -> list of request timestamps
_rate_limit: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 3
_RATE_LIMIT_WINDOW = 3600  # 1 hour


def _check_rate_limit(email: str) -> None:
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW
    timestamps = [t for t in _rate_limit[email] if t > cutoff]
    _rate_limit[email] = timestamps
    if len(timestamps) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many reset requests. Please try again in an hour.",
        )
    _rate_limit[email].append(now)


# Used-token set to invalidate tokens after a successful reset
_used_tokens: set[str] = set()


def _origin_from_header(value: str | None) -> str | None:
    if not value:
        return None
    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _is_allowed_frontend_origin(origin: str, configured_base: str) -> bool:
    origin_parsed = urlparse(origin)
    configured_parsed = urlparse(configured_base)
    if origin_parsed.netloc.lower() == configured_parsed.netloc.lower():
        return origin_parsed.scheme == configured_parsed.scheme

    local_hosts = {"localhost", "127.0.0.1", "::1"}
    return (
        (configured_parsed.hostname or "").lower() in local_hosts
        and (origin_parsed.hostname or "").lower() in local_hosts
    )


def _reset_link_base_url(request: Request) -> str:
    configured_base = normalize_frontend_base_url(get_settings().frontend_base_url)
    request_origin = _origin_from_header(request.headers.get("origin"))
    if request_origin:
        request_origin = normalize_frontend_base_url(request_origin)
        if _is_allowed_frontend_origin(request_origin, configured_base):
            return request_origin

    request_referer = _origin_from_header(request.headers.get("referer"))
    if request_referer:
        request_referer = normalize_frontend_base_url(request_referer)
        if _is_allowed_frontend_origin(request_referer, configured_base):
            return request_referer

    return configured_base


class RequestResetBody(BaseModel):
    email: str


class VerifyTokenBody(BaseModel):
    token: str


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str


@router.post("/request-reset")
def request_reset(
    body: RequestResetBody,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_db)],
):
    _check_rate_limit(body.email.strip().lower())

    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(body.email.strip())

    if candidate:
        token = generate_reset_token(body.email.strip())
        base = _reset_link_base_url(request)
        reset_url = build_reset_url(token, base)
        logger.info("[forget-password] Password reset link generated with base %s", base)
        background_tasks.add_task(send_reset_email, body.email.strip(), reset_url)

    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/verify-token")
def verify_token_endpoint(body: VerifyTokenBody):
    if body.token in _used_tokens:
        raise HTTPException(status_code=400, detail="This reset link has already been used.")
    email = verify_reset_token(body.token)
    return {"email": email, "valid": True}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordBody,
    session: Annotated[Session, Depends(get_db)],
):
    if body.token in _used_tokens:
        raise HTTPException(status_code=400, detail="This reset link has already been used.")

    email = verify_reset_token(body.token)

    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(email)
    if not candidate:
        raise HTTPException(status_code=404, detail="User not found.")

    candidate.password = hash_password(body.new_password)
    session.commit()

    _used_tokens.add(body.token)

    return {"message": "Password updated successfully."}
