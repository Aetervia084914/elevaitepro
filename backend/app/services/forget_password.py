"""Password reset service.

Reuses the SMTP + itsdangerous infrastructure from email_verification.py
with a dedicated salt to ensure tokens are scoped to password reset only.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import urlencode, urlparse

from fastapi import HTTPException
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_SALT = "password-reset"
_EXPIRY_SECONDS = 900  # 15 minutes
_LOCAL_FRONTEND_HOSTS = {"localhost", "127.0.0.1", "::1"}

_smtp_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="smtp-reset")


def _settings():
    return get_settings()


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_settings().email_verification_secret, salt=_SALT)


def generate_reset_token(email: str) -> str:
    return _serializer().dumps(email)


def normalize_frontend_base_url(base_url: str | None) -> str:
    if base_url is None or not base_url.strip():
        raise RuntimeError("FRONTEND_BASE_URL is required")

    base = base_url.strip().rstrip("/")
    if "://" not in base:
        parsed_host = urlparse(f"//{base}").hostname or ""
        scheme = "http" if parsed_host.lower() in _LOCAL_FRONTEND_HOSTS else "https"
        base = f"{scheme}://{base}"

    parsed = urlparse(base)
    if parsed.scheme not in {"http", "https"}:
        raise RuntimeError("FRONTEND_BASE_URL must use http or https")
    if not parsed.netloc or not parsed.hostname:
        raise RuntimeError("FRONTEND_BASE_URL must include a hostname")
    if parsed.scheme != "https" and parsed.hostname.lower() not in _LOCAL_FRONTEND_HOSTS:
        raise RuntimeError("FRONTEND_BASE_URL must use HTTPS for non-local hosts")

    return base


def build_reset_url(token: str, base_url: str | None = None) -> str:
    base = normalize_frontend_base_url(base_url or _settings().frontend_base_url)
    return f"{base}/reset-password?{urlencode({'token': token})}"


def verify_reset_token(token: str) -> str:
    """Returns the email on success, raises HTTPException(400) on failure."""
    try:
        email: str = _serializer().loads(token, max_age=_EXPIRY_SECONDS)
        return email
    except SignatureExpired:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid reset link. Please request a new one.")
    except Exception as exc:
        logger.warning("[forget-password] Token decode error: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid reset link.")


def _build_reset_email(to_email: str, reset_url: str) -> MIMEMultipart:
    cfg = _settings()
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{cfg.smtp_from_name} <{cfg.smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Reset your elevAIte pro password"

    plain_text = f"""Hi,

You requested a password reset for your elevAIte pro account.

Click the link below to set a new password:

{reset_url}

This link expires in 15 minutes. If you did not request this, you can safely ignore this email.

Best regards,
The elevAIte pro Team
"""

    html_body = f"""<!DOCTYPE html>
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
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;font-weight:600;">Reset your password</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We received a request to reset the password for your account.<br><br>
        Click the button below to choose a new password.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:14px 32px;">
            <a href="{reset_url}" style="color:white;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
        This link expires in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="{reset_url}" style="color:#4f46e5;word-break:break-all;">{reset_url}</a>
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

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    return msg


def _send_smtp_reset(to_email: str, reset_url: str) -> None:
    cfg = _settings()
    if not cfg.smtp_user or not cfg.smtp_password:
        raise RuntimeError("SMTP credentials not configured")

    msg = _build_reset_email(to_email, reset_url)
    context = ssl.create_default_context()
    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(cfg.smtp_user, cfg.smtp_password)
        server.sendmail(cfg.smtp_user, to_email, msg.as_string())

    logger.info("[forget-password] Reset email sent to %s", to_email)


def send_reset_email(email: str, reset_url: str) -> None:
    """Blocking — intended to be called inside a BackgroundTask (already off event loop)."""
    try:
        _send_smtp_reset(email, reset_url)
    except Exception as exc:
        logger.error("[forget-password] Failed to send reset email to %s: %s", email, exc)
