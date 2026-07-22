"""Email verification service.

Generates URL-safe time-limited tokens (itsdangerous) and sends verification
emails via SMTP (Office 365 / any SMTP server).

All credentials are read from environment variables — never hardcoded.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.core.config import get_settings
from app.services.forget_password import normalize_frontend_base_url

logger = logging.getLogger(__name__)

# ── Config from Settings (.env via pydantic-settings) ────────────────────────

def _settings():
    """Lazy singleton — pydantic-settings loads .env on first call."""
    return get_settings()

# Thread pool for blocking SMTP calls (keeps FastAPI event loop free)
_smtp_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="smtp")

# ── Token generation & validation ─────────────────────────────────────────────

def _serializer() -> URLSafeTimedSerializer:
    """Lazy init so .env is loaded before the secret is read."""
    return URLSafeTimedSerializer(_settings().email_verification_secret, salt="email-verify")


def generate_verification_token(email: str) -> str:
    """Create a URL-safe signed token containing the email address."""
    return _serializer().dumps(email)


def verify_token(token: str) -> str | None:
    """Decode and verify the token. Returns the email if valid, None otherwise.

    Token expires after EMAIL_VERIFICATION_EXPIRY_HOURS (default 24h).
    """
    try:
        email: str = _serializer().loads(token, max_age=_settings().email_verification_expiry_hours * 3600)
        return email
    except SignatureExpired:
        logger.warning("[email-verify] Token expired")
        return None
    except BadSignature:
        logger.warning("[email-verify] Invalid token signature")
        return None
    except Exception as exc:
        logger.warning("[email-verify] Token decode error: %s", exc)
        return None


# ── Verification URL builder ──────────────────────────────────────────────────

def build_verification_url(token: str) -> str:
    """Build the frontend verification URL that the user clicks."""
    base = normalize_frontend_base_url(_settings().frontend_base_url)
    return f"{base}/verify-email?token={token}"


# ── Email sending ─────────────────────────────────────────────────────────────

def _build_verification_email(to_email: str, name: str, verification_url: str) -> MIMEMultipart:
    """Construct a beautiful HTML verification email."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{_settings().smtp_from_name} <{_settings().smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Verify your email — elevAIte pro"

    plain_text = f"""Hi {name},

Thank you for signing up with elevAIte pro!

Please verify your email address by clicking the link below:

{verification_url}

This link will expire in {_settings().email_verification_expiry_hours} hours.

If you did not create an account, please ignore this email.

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
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;font-weight:600;">Verify your email</h2>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hi <strong>{name}</strong>,<br><br>
        Thank you for signing up! Please verify your email address to activate your account and start using elevAIte pro.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:14px 32px;">
            <a href="{verification_url}" style="color:white;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>
      <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
        This link expires in <strong>{_settings().email_verification_expiry_hours} hours</strong>. If you did not create an account, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="{verification_url}" style="color:#4f46e5;word-break:break-all;">{verification_url}</a>
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


def _send_smtp(to_email: str, name: str, verification_url: str) -> None:
    """Blocking SMTP send — runs in a thread pool."""
    cfg = _settings()
    if not cfg.smtp_user or not cfg.smtp_password:
        raise RuntimeError("SMTP credentials not configured in environment variables")

    msg = _build_verification_email(to_email, name, verification_url)

    context = ssl.create_default_context()
    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(cfg.smtp_user, cfg.smtp_password)
        server.sendmail(cfg.smtp_user, to_email, msg.as_string())

    logger.info("[email-verify] Verification email sent to %s", to_email)


async def send_verification_email(to_email: str, name: str) -> bool:
    """Generate token, build URL, send verification email (non-blocking).

    Returns True on success, False on failure.
    """
    import asyncio

    token = generate_verification_token(to_email)
    url = build_verification_url(token)

    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(_smtp_pool, _send_smtp, to_email, name, url)
        return True
    except Exception as exc:
        logger.error("[email-verify] Failed to send to %s: %s", to_email, exc)
        return False
