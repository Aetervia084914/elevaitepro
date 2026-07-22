"""Support ticket email service.

Sends support ticket notifications to the configured support inbox(es) via SMTP.

All credentials and recipients are read from environment variables (via
pydantic-settings) — never hardcoded. Mirrors the SMTP approach used by
``app.services.email_verification``.
"""
from __future__ import annotations

import asyncio
import html
import logging
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Thread pool for blocking SMTP calls (keeps the FastAPI event loop free).
_smtp_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="support-smtp")


def parse_recipients(raw: str) -> list[str]:
    """Parse a comma-separated MAIL_TO value into a clean list of addresses."""
    return [addr.strip() for addr in (raw or "").split(",") if addr.strip()]


def _build_ticket_email(
    name: str,
    email: str,
    subject: str,
    description: str,
    recipients: list[str],
    ticket_number: str | None = None,
) -> MIMEMultipart:
    """Construct the support-ticket notification email (sent to the team)."""
    cfg = get_settings()
    from_addr = cfg.mail_from or cfg.smtp_user
    ref = ticket_number or "—"

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((cfg.smtp_from_name, from_addr))
    msg["To"] = ", ".join(recipients)
    subject_ref = f"[{ticket_number}] " if ticket_number else ""
    msg["Subject"] = f"[Support Ticket] {subject_ref}{subject} — {name}"
    # Let support staff reply straight to the person who raised the ticket.
    msg["Reply-To"] = formataddr((name, email))

    plain_text = (
        "New support ticket submitted via elevAIte pro Support Centre\n"
        "============================================================\n\n"
        f"Ticket No.:  {ref}\n"
        f"Name:        {name}\n"
        f"Email:       {email}\n"
        f"Subject:     {subject}\n\n"
        "Description:\n"
        f"{description}\n\n"
        "------------------------------------------------------------\n"
        "Reply directly to this email to respond to the customer.\n"
    )

    safe_desc = html.escape(description).replace("\n", "<br>")
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 40px;">
      <h1 style="color:white;font-size:22px;margin:0;font-weight:700;letter-spacing:-0.5px;">New Support Ticket</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">elevAIte pro Support Centre &middot; {html.escape(ref)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:#1e293b;">
        <tr><td style="padding:6px 0;color:#64748b;width:110px;">Ticket No.</td><td style="padding:6px 0;font-weight:700;">{html.escape(ref)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Name</td><td style="padding:6px 0;font-weight:600;">{html.escape(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;font-weight:600;"><a href="mailto:{html.escape(email)}" style="color:#4f46e5;text-decoration:none;">{html.escape(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;font-weight:600;">{html.escape(subject)}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Description</p>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0;">{safe_desc}</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;padding:18px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">Reply directly to this email to respond to the customer.</p>
    </td>
  </tr>
</table>
</body>
</html>"""

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    return msg


def _build_confirmation_email(
    name: str,
    email: str,
    subject: str,
    description: str,
    ticket_number: str,
) -> MIMEMultipart:
    """Construct the confirmation email sent back to the ticket raiser."""
    cfg = get_settings()
    from_addr = cfg.mail_from or cfg.smtp_user

    msg = MIMEMultipart("alternative")
    msg["From"] = formataddr((cfg.smtp_from_name, from_addr))
    msg["To"] = formataddr((name, email))
    msg["Subject"] = f"We've received your ticket {ticket_number} — elevAIte pro Support"

    plain_text = (
        f"Hi {name},\n\n"
        "Thanks for contacting elevAIte pro Support. We've received your ticket "
        "and our team will get back to you within one business day.\n\n"
        f"Ticket number: {ticket_number}\n"
        f"Subject:       {subject}\n\n"
        "Your message:\n"
        f"{description}\n\n"
        "Please keep your ticket number for reference.\n\n"
        "Best regards,\n"
        "The elevAIte pro Team\n"
    )

    safe_desc = html.escape(description).replace("\n", "<br>")
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
      <h1 style="color:white;font-size:26px;margin:0;font-weight:700;letter-spacing:-0.5px;">elevAIte pro</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:8px 0 0;">Support Centre</p>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px;">
      <h2 style="color:#1e293b;font-size:20px;margin:0 0 16px;font-weight:600;">We've received your ticket</h2>
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Hi <strong>{html.escape(name)}</strong>,<br><br>
        Thanks for reaching out. Our team will review your message and get back to you
        at this email address within one business day.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:14px 22px;">
            <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Your ticket number</span><br>
            <span style="color:#4f46e5;font-size:22px;font-weight:800;letter-spacing:0.5px;">{html.escape(ticket_number)}</span>
          </td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Subject</p>
      <p style="color:#334155;font-size:15px;margin:0 0 18px;">{html.escape(subject)}</p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Your message</p>
      <p style="color:#334155;font-size:15px;line-height:1.7;margin:0;">{safe_desc}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="color:#94a3b8;font-size:13px;margin:0;">Please keep your ticket number for reference when following up.</p>
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


def _deliver(msg: MIMEMultipart, recipients: list[str]) -> None:
    """Blocking SMTP delivery of a prepared message — runs in the thread pool."""
    cfg = get_settings()
    if not cfg.smtp_user or not cfg.smtp_password:
        raise RuntimeError("SMTP credentials not configured in environment variables")
    if not recipients:
        raise RuntimeError("No recipients to deliver to")

    from_addr = cfg.mail_from or cfg.smtp_user

    context = ssl.create_default_context()
    if cfg.smtp_use_tls:
        with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(cfg.smtp_user, cfg.smtp_password)
            server.sendmail(from_addr, recipients, msg.as_string())
    else:
        # Implicit-TLS (e.g. port 465) when STARTTLS is disabled.
        with smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=30, context=context) as server:
            server.login(cfg.smtp_user, cfg.smtp_password)
            server.sendmail(from_addr, recipients, msg.as_string())


def _send_team_notification_blocking(
    name: str,
    email: str,
    subject: str,
    description: str,
    recipients: list[str],
    ticket_number: str | None,
) -> None:
    """Blocking team-notification send."""
    if not recipients:
        raise RuntimeError("No support recipients configured (set MAIL_TO in .env)")
    msg = _build_ticket_email(name, email, subject, description, recipients, ticket_number)
    _deliver(msg, recipients)
    logger.info(
        "[support-ticket] Team notification sent to %d recipient(s) for %s",
        len(recipients), ticket_number or "(no number)",
    )


def _send_confirmation_blocking(
    name: str,
    email: str,
    subject: str,
    description: str,
    ticket_number: str,
) -> None:
    """Blocking confirmation send to the ticket raiser."""
    msg = _build_confirmation_email(name, email, subject, description, ticket_number)
    _deliver(msg, [email])
    logger.info("[support-ticket] Confirmation sent to %s for %s", email, ticket_number)


# Backwards-compatible alias for the original blocking signature.
def _send_smtp(
    name: str,
    email: str,
    subject: str,
    description: str,
    recipients: list[str],
) -> None:
    _send_team_notification_blocking(name, email, subject, description, recipients, None)


async def send_team_notification(
    name: str,
    email: str,
    subject: str,
    description: str,
    ticket_number: str | None = None,
) -> int:
    """Send the support-team notification (non-blocking).

    Returns the number of recipients. Raises on misconfig / SMTP failure.
    """
    recipients = parse_recipients(get_settings().mail_to)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        _smtp_pool,
        _send_team_notification_blocking,
        name, email, subject, description, recipients, ticket_number,
    )
    return len(recipients)


async def send_user_confirmation(
    name: str,
    email: str,
    subject: str,
    description: str,
    ticket_number: str,
) -> None:
    """Send the confirmation email back to the ticket raiser (non-blocking).

    Raises on misconfig / SMTP failure so the caller can record the outcome.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        _smtp_pool,
        _send_confirmation_blocking,
        name, email, subject, description, ticket_number,
    )


async def send_support_ticket(
    name: str,
    email: str,
    subject: str,
    description: str,
    ticket_number: str | None = None,
) -> int:
    """Backwards-compatible wrapper — sends only the team notification.

    Retained so existing callers/tests keep working. Returns the recipient count.
    """
    return await send_team_notification(name, email, subject, description, ticket_number)
