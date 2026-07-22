"""Support ticket submission endpoint.

Receives ticket submissions from the Support Centre form, persists them to the
database with a generated ticket number, then emails the support team and sends
a confirmation to the ticket raiser. The ticket is always saved first, so an
email failure never loses the ticket; email failures are logged server-side and
reflected in the response.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.support_repository import SupportRepository
from app.schemas.support import SupportTicketRequest, SupportTicketResponse
from app.services.support_ticket import send_team_notification, send_user_confirmation

router = APIRouter(tags=["support"])
logger = logging.getLogger(__name__)


@router.post("/submitticket", response_model=SupportTicketResponse)
async def submit_ticket(
    body: SupportTicketRequest,
    session: Annotated[Session, Depends(get_db)],
) -> SupportTicketResponse:
    # 1. Persist the ticket first — this is the source of truth and must succeed.
    try:
        repo = SupportRepository(session)
        ticket = repo.create_ticket(
            name=body.name,
            email=body.email,
            subject=body.subject,
            description=body.description,
        )
    except Exception as exc:
        logger.exception("[support-ticket] Failed to persist ticket from %s: %s", body.email, exc)
        raise HTTPException(
            status_code=500,
            detail="We couldn't record your ticket right now. Please try again shortly.",
        )

    ticket_number = ticket.ticket_number
    recipients = 0
    team_sent = False
    confirmation_sent = False

    # 2. Notify the support team (best-effort — ticket is already saved).
    try:
        recipients = await send_team_notification(
            name=body.name,
            email=body.email,
            subject=body.subject,
            description=body.description,
            ticket_number=ticket_number,
        )
        team_sent = True
    except RuntimeError as exc:
        logger.error("[support-ticket] %s — team email not configured: %s", ticket_number, exc)
    except Exception as exc:
        logger.exception("[support-ticket] %s — team notification failed: %s", ticket_number, exc)

    # 3. Send the confirmation email to the ticket raiser (best-effort).
    try:
        await send_user_confirmation(
            name=body.name,
            email=body.email,
            subject=body.subject,
            description=body.description,
            ticket_number=ticket_number,
        )
        confirmation_sent = True
    except Exception as exc:
        logger.exception("[support-ticket] %s — confirmation to %s failed: %s", ticket_number, body.email, exc)

    # 4. Record delivery outcome on the ticket (non-fatal if this fails).
    try:
        repo.mark_emails_sent(ticket, team=team_sent, user=confirmation_sent)
    except Exception:
        logger.warning("[support-ticket] %s — could not update email flags", ticket_number)

    return SupportTicketResponse(
        success=True,
        message=(
            f"Your ticket {ticket_number} has been received. "
            "We'll get back to you within one business day."
        ),
        ticket_number=ticket_number,
        recipients=recipients,
        confirmation_sent=confirmation_sent,
    )
