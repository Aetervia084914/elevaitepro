from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

# Same lightweight pattern the frontend uses — avoids pulling in email-validator.
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class SupportTicketRequest(BaseModel):
    """Payload submitted from the Support Centre ticket form."""

    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=150)
    subject: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=1000)

    @field_validator("name", "email", "subject", "description", mode="before")
    @classmethod
    def _strip(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address.")
        return v


class SupportTicketResponse(BaseModel):
    success: bool
    message: str
    ticket_number: str | None = None
    recipients: int = 0
    confirmation_sent: bool = False
