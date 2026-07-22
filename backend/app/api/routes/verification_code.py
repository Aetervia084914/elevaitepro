from __future__ import annotations

import logging
import re
import time
from collections import defaultdict
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.repositories.auth_repository import AuthRepository
from app.schemas.verification_code import (
    ResendCodeRequest,
    ResendCodeResponse,
    SendCodeRequest,
    SendCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
)
from app.services.verification_code import (
    cleanup_expired,
    create_verification,
    verify_code,
)

router = APIRouter(prefix="/verification", tags=["verification"])
logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

_rate_limit: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 5
_RATE_LIMIT_WINDOW = 300


def _check_rate_limit(key: str) -> None:
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW
    timestamps = [t for t in _rate_limit[key] if t > cutoff]
    _rate_limit[key] = timestamps
    if len(timestamps) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
        )
    _rate_limit[key].append(now)


def _validate_email(email: str) -> str:
    email = email.strip().lower()
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address.")
    return email


def _send_code_email(to_email: str, name: str, code: str) -> None:
    """Send the verification code via SMTP (blocking — run in background)."""
    import smtplib
    import ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    cfg = get_settings()
    if not cfg.smtp_user or not cfg.smtp_password:
        raise RuntimeError("SMTP credentials not configured")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{cfg.smtp_from_name} <{cfg.smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Your verification code — elevAIte pro"

    display_name = name or "there"

    plain = (
        f"Hi {display_name},\n\n"
        f"Your elevAIte pro verification code is: {code}\n\n"
        f"This code expires in 2 minutes. Do not share it with anyone.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Best regards,\nThe elevAIte pro Team\n"
    )

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
      <h1 style="color:white;font-size:28px;margin:0;font-weight:700;letter-spacing:-0.5px;">elevAIte pro</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Career Intelligence Platform</p>
    </td>
  </tr>
  <tr>
    <td style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;font-weight:600;">Verification Code</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hi <strong>{display_name}</strong>,<br><br>
        Use the code below to verify your email address:
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <div style="display:inline-block;background:#f1f5f9;border:2px dashed #4f46e5;border-radius:12px;padding:16px 40px;font-size:36px;font-weight:800;letter-spacing:8px;color:#1e293b;font-family:monospace;">
          {code}
        </div>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
        This code expires in <strong>2 minutes</strong>. Do not share it with anyone.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; 2025 elevAIte pro by Aetervia. All rights reserved.</p>
    </td>
  </tr>
</table>
</body>
</html>"""

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(cfg.smtp_user, cfg.smtp_password)
        server.sendmail(cfg.smtp_user, to_email, msg.as_string())

    logger.info("[verification-code] Code email sent to %s", to_email)


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(
    body: SendCodeRequest,
    background_tasks: BackgroundTasks,
    session: Annotated[Session, Depends(get_db)],
) -> SendCodeResponse:
    email = _validate_email(body.email)
    _check_rate_limit(email)

    repo = AuthRepository(session)
    if repo.email_exists(email):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please sign in.",
        )

    cleanup_expired()

    try:
        code, session_token = create_verification(email)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

    background_tasks.add_task(_send_code_email, email, body.name.strip(), code)

    return SendCodeResponse(
        success=True,
        message="Verification code sent to your email.",
        session_token=session_token,
    )


@router.post("/verify-code", response_model=VerifyCodeResponse)
def verify_code_endpoint(body: VerifyCodeRequest) -> VerifyCodeResponse:
    email = _validate_email(body.email)

    if not body.code or not body.code.strip():
        raise HTTPException(status_code=400, detail="Verification code is required.")

    success, message, session_token = verify_code(email, body.code)

    if not success:
        return VerifyCodeResponse(success=False, message=message)

    return VerifyCodeResponse(
        success=True,
        message=message,
        session_token=session_token,
    )


@router.post("/resend-code", response_model=ResendCodeResponse)
def resend_code(
    body: ResendCodeRequest,
    background_tasks: BackgroundTasks,
) -> ResendCodeResponse:
    email = _validate_email(body.email)
    _check_rate_limit(email)

    cleanup_expired()

    try:
        code, session_token = create_verification(email)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

    background_tasks.add_task(_send_code_email, email, body.name.strip(), code)

    return ResendCodeResponse(
        success=True,
        message="New verification code sent to your email.",
        session_token=session_token,
    )
