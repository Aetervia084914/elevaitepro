from __future__ import annotations

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.candidate_cache import delete_candidate_cache
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import (
    CheckEmailVerifiedRequest,
    CheckEmailVerifiedResponse,
    CreateLoginRequest,
    CreateLoginResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    UserInfo,
    ValidateEmailRequest,
    ValidateEmailResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
)
from app.services.email_verification import verify_token
from app.services.passwords import hash_password, password_needs_rehash, verify_password

router = APIRouter(tags=["auth"])


def _to_pg_date(value: object) -> date:
    if not value:
        return date.today()
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(float(value)).date()
    if isinstance(value, str):
        if value.isdigit():
            return datetime.utcfromtimestamp(int(value)).date()
        return date.fromisoformat(value[:10])
    return date.today()


@router.post("/validateemail", response_model=ValidateEmailResponse)
def validate_email(
    body: ValidateEmailRequest,
    session: Annotated[Session, Depends(get_db)],
) -> ValidateEmailResponse:
    repo = AuthRepository(session)
    return ValidateEmailResponse(exists=repo.email_exists(body.email))


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    session: Annotated[Session, Depends(get_db)],
) -> LoginResponse:
    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(body.email)
    if not candidate:
        raise HTTPException(status_code=404, detail="User does not exist. Please sign up.")
    if not verify_password(body.password, candidate.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not candidate.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox and verify your email before logging in.",
        )
    if password_needs_rehash(candidate.password):
        candidate.password = hash_password(body.password)
    user_session = repo.create_session(candidate.id, expires_in_seconds=3600)
    session.commit()
    return LoginResponse(
        sessionId=user_session.session_token,
        user=UserInfo(
            id=str(candidate.id),
            name=candidate.name,
            email=candidate.email,
            career_aspirations=candidate.career_aspirations,
            selected_tier=candidate.selected_tier,
            last_payment_date=str(candidate.last_payment_date) if candidate.last_payment_date else None,
            created_at=str(candidate.created_at) if candidate.created_at else None,
        ),
    )


@router.post("/userlogout", response_model=LogoutResponse)
def user_logout(
    session: Annotated[Session, Depends(get_db)],
    x_session_id: Annotated[str | None, Header()] = None,
) -> LogoutResponse:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Session ID missing")
    # Delete RedisJSON candidate cache before removing the DB session
    try:
        delete_candidate_cache(x_session_id)
    except Exception:
        pass  # non-fatal

    repo = AuthRepository(session)
    repo.delete_session_by_token(x_session_id)
    session.commit()
    return LogoutResponse(message="Logged out successfully")


@router.post("/createlogin", response_model=CreateLoginResponse)
async def create_login(
    body: CreateLoginRequest,
    session: Annotated[Session, Depends(get_db)],
) -> CreateLoginResponse:
    """Create login endpoint - DEPRECATED in favor of /payment/complete-payment flow.
    
    This endpoint is kept for backward compatibility but should NOT be used for new registrations.
    New users MUST go through: verification code → payment → complete-payment.
    """
    if not body.name.strip() or not body.email.strip() or not body.password.strip() or not body.selected_tier.strip():
        raise HTTPException(status_code=400, detail="Missing required fields")
    career_aspirations = body.target_job_title or ""
    last_payment_date = _to_pg_date(body.last_payment_date)
    created_at = _to_pg_date(body.created_payment_date)
    repo = AuthRepository(session)
    candidate = repo.create_or_update_candidate(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        career_aspirations=career_aspirations,
        selected_tier=body.selected_tier,
        last_payment_date=last_payment_date,
        created_at=created_at,
    )
    
    # ✅ FIXED: Set email_verified to TRUE (assumes email was verified before calling this)
    candidate.email_verified = True
    
    user_session = repo.create_session(candidate.id, expires_in_seconds=86400)
    session.commit()

    # ✅ FIXED: No longer sending verification email
    return CreateLoginResponse(
        success=True,
        candidateId=str(candidate.id),
        sessionId=user_session.session_token,
        sessionToken=user_session.session_token,
        email_verification_sent=False,
        message="Account created successfully. Email already verified.",
    )


@router.post("/verify-email", response_model=VerifyEmailResponse)
def verify_email_token(
    body: VerifyEmailRequest,
    session: Annotated[Session, Depends(get_db)],
) -> VerifyEmailResponse:
    """Verify email token - LEGACY ENDPOINT.
    
    This endpoint is maintained for backward compatibility with old verification links.
    New registrations use 6-digit code verification before payment.
    """
    email = verify_token(body.token)
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification link. New registrations use 6-digit code verification.",
        )

    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(email)
    if not candidate:
        raise HTTPException(status_code=404, detail="User not found.")

    if candidate.email_verified:
        return VerifyEmailResponse(
            success=True,
            message="Email already verified. You can log in.",
            email=email,
        )

    candidate.email_verified = True
    session.commit()

    return VerifyEmailResponse(
        success=True,
        message="Email verified successfully! You can now log in.",
        email=email,
    )


@router.post("/check-email-verified", response_model=CheckEmailVerifiedResponse)
def check_email_verified(
    body: CheckEmailVerifiedRequest,
    session: Annotated[Session, Depends(get_db)],
) -> CheckEmailVerifiedResponse:
    """Check whether a candidate's email has been verified."""
    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(body.email.strip())
    if not candidate:
        raise HTTPException(status_code=404, detail="No account found with this email.")
    if candidate.email_verified:
        return CheckEmailVerifiedResponse(
            verified=True,
            message="Email verified. You may proceed.",
        )
    return CheckEmailVerifiedResponse(
        verified=False,
        message="Email not verified yet. Please click the link in your inbox.",
    )


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    body: ResendVerificationRequest,
    session: Annotated[Session, Depends(get_db)],
) -> ResendVerificationResponse:
    """Resend verification email - DEPRECATED.
    
    This endpoint is no longer needed as email verification happens via 6-digit code
    BEFORE account creation. If this endpoint is called, the user should use the
    /verification/resend-code endpoint instead.
    """
    repo = AuthRepository(session)
    candidate = repo.get_candidate_by_email(body.email.strip())
    if not candidate:
        raise HTTPException(
            status_code=404, 
            detail="No account found. Please complete registration first."
        )

    if candidate.email_verified:
        return ResendVerificationResponse(
            success=True,
            message="Email is already verified. You can log in.",
        )

    # ✅ FIXED: Direct user to use verification code system instead
    return ResendVerificationResponse(
        success=False,
        message="Please use the 6-digit verification code system during registration. Contact support if you need assistance.",
    )
