from __future__ import annotations

from pydantic import BaseModel


class SendCodeRequest(BaseModel):
    email: str
    name: str = ""


class SendCodeResponse(BaseModel):
    success: bool
    message: str
    session_token: str | None = None


class VerifyCodeRequest(BaseModel):
    email: str
    code: str


class VerifyCodeResponse(BaseModel):
    success: bool
    message: str
    session_token: str | None = None


class ResendCodeRequest(BaseModel):
    email: str
    name: str = ""


class ResendCodeResponse(BaseModel):
    success: bool
    message: str
    session_token: str | None = None
