from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ValidateEmailRequest(BaseModel):
    email: str


class ValidateEmailResponse(BaseModel):
    exists: bool


class LoginRequest(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    career_aspirations: str | None = None
    selected_tier: str
    last_payment_date: Any = None
    created_at: Any = None


class LoginResponse(BaseModel):
    sessionId: str
    user: UserInfo


class LogoutResponse(BaseModel):
    message: str


class CreateLoginRequest(BaseModel):
    name: str
    email: str
    password: str
    target_job_title: str | None = None
    selected_tier: str
    last_payment_date: Any = None
    created_payment_date: Any = None


class CreateLoginResponse(BaseModel):
    success: bool
    candidateId: str
    sessionId: str
    sessionToken: str
    email_verification_sent: bool = False
    message: str = ""


class VerifyEmailRequest(BaseModel):
    token: str


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str
    email: str | None = None


class ResendVerificationRequest(BaseModel):
    email: str


class ResendVerificationResponse(BaseModel):
    success: bool
    message: str


class CheckEmailVerifiedRequest(BaseModel):
    email: str


class CheckEmailVerifiedResponse(BaseModel):
    verified: bool
    message: str
