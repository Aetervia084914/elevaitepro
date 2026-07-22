from datetime import date, datetime
from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.logging import get_logger
from app.repositories.auth_repository import AuthRepository
from app.schemas.payment import CreateCheckoutSessionRequest, CreateCheckoutSessionResponse
from app.services.passwords import hash_password

logger = get_logger(__name__)
router = APIRouter(tags=["payment"], prefix="/payment")

_settings = get_settings()
STRIPE_PUBLIC_KEY = _settings.stripe_public_key
STRIPE_SECRET_KEY = _settings.stripe_secret_key

if not STRIPE_SECRET_KEY:
    logger.warning("STRIPE_SECRET_KEY not found in configuration")
else:
    stripe.api_key = STRIPE_SECRET_KEY


AMOUNT_GBP_PENCE = 1999  # £19.99
AMOUNT_GBP = 19.99


class CreateDirectCheckoutRequest(BaseModel):
    email: str
    success_url: str
    cancel_url: str


class CreateDirectCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


@router.post("/create-direct-checkout", response_model=CreateDirectCheckoutResponse)
async def create_direct_checkout(body: CreateDirectCheckoutRequest) -> CreateDirectCheckoutResponse:
    """Create a Stripe Checkout Session and return the hosted checkout URL.

    Called directly by the frontend — no Next.js proxy needed.
    """
    if not STRIPE_SECRET_KEY:
        logger.error("Stripe secret key not configured")
        raise HTTPException(status_code=500, detail="Payment service not configured.")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "gbp",
                        "product_data": {
                            "name": "elevAIte pro",
                            "description": "Intelligence Suite Activation",
                        },
                        "unit_amount": AMOUNT_GBP_PENCE,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            customer_email=body.email,
        )

        logger.info("Direct checkout session created: %s for %s", session.id, body.email)

        return CreateDirectCheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    except stripe.error.StripeError as e:
        logger.error("Stripe error creating checkout: %s", e)
        raise HTTPException(status_code=500, detail="Failed to initialize payment.")

    except Exception as e:
        logger.exception("Unexpected error creating checkout: %s", e)
        raise HTTPException(status_code=500, detail="Server error. Please try again.")


class VerifySessionRequest(BaseModel):
    """Request to verify a payment session."""
    session_id: str


class VerifySessionResponse(BaseModel):
    """Response containing payment verification status."""
    status: str
    amount: float
    currency: str


@router.post("/create-checkout-session", response_model=CreateCheckoutSessionResponse)
async def create_checkout_session(request: CreateCheckoutSessionRequest) -> CreateCheckoutSessionResponse:
    """
    Create a Stripe Checkout session for payment.
    
    This endpoint creates a Stripe Checkout session and returns the URL
    where the user should be redirected to complete the payment.
    """
    logger.info(f"Payment request received - Amount: {request.amount}, Email: {request.email}")
    logger.debug(f"Full request payload - Amount: {request.amount}, Description: {request.description}, Email: {request.email}, Success URL: {request.success_url}, Cancel URL: {request.cancel_url}")
    logger.info(STRIPE_SECRET_KEY)
    try:
        if not STRIPE_SECRET_KEY:
            logger.error("Stripe secret key not configured1")
            raise HTTPException(
                status_code=500,
                detail="Payment service not configured. Please contact support."
            )
        
        # Convert pounds to pence (Stripe uses smallest currency unit)
        amount_in_pence = int(request.amount * 100)
        
        # Create Stripe Checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "gbp",
                        "product_data": {
                            "name": "elevAIte pro",
                            "description": request.description,
                        },
                        "unit_amount": amount_in_pence,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            customer_email=request.email,
        )
        
        logger.info(f"Checkout session created: {session.id} for {request.email}")
        
        return CreateCheckoutSessionResponse(
            session_id=session.id,
            checkout_url=session.url,
        )
    
    except stripe.error.CardError as e:
        logger.error(f"Card error: {e}")
        raise HTTPException(status_code=400, detail="Card error occurred during payment")
    
    except stripe.error.RateLimitError as e:
        logger.error(f"Rate limit error: {e}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    except stripe.error.InvalidRequestError as e:
        logger.error(f"Invalid request error: {e}")
        raise HTTPException(status_code=400, detail="Invalid request to payment service")
    
    except stripe.error.AuthenticationError as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=504, detail="Payment service authentication failed")
    
    except stripe.error.APIConnectionError as e:
        logger.error(f"API connection error: {e}")
        raise HTTPException(status_code=503, detail="Payment service temporarily unavailable")
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=510, detail="Payment service error occurred")
    
    except Exception as e:
        logger.exception(f"Unexpected error creating checkout session1: {e}")
        raise HTTPException(status_code=509, detail=str(e))


@router.post("/verify-session", response_model=VerifySessionResponse)
async def verify_payment_session(request: VerifySessionRequest) -> VerifySessionResponse:
    """
    Verify a Stripe Checkout session payment status.
    
    This endpoint verifies that a payment was successfully completed by checking
    the Stripe session status. ONLY call createlogin after this endpoint returns
    status='paid' or 'succeeded'.
    
    Safety: Prevents account creation before payment is confirmed.
    """
    if not request.session_id:
        logger.error("Missing session_id in verify request")
        raise HTTPException(status_code=400, detail="session_id is required")
    
    logger.info(f"Verifying payment session: {request.session_id}")
    
    try:
        if not STRIPE_SECRET_KEY:
            logger.error("Stripe secret key not configured")
            raise HTTPException(
                status_code=500,
                detail="Payment service not configured. Please contact support."
            )
        
        # Retrieve session from Stripe
        session = stripe.checkout.Session.retrieve(request.session_id)
        
        logger.info(f"Session retrieved - Status: {session.payment_status}, Mode: {session.mode}")
        
        # Check payment status
        if session.payment_status not in ['paid', 'no_payment_required']:
            logger.warning(f"Payment not completed for session {request.session_id}: {session.payment_status}")
            raise HTTPException(
                status_code=402,
                detail=f"Payment not completed. Status: {session.payment_status}"
            )
        
        # Get amount from line items
        amount = 0
        currency = "gbp"
        if session.line_items:
            for item in session.line_items.list():
                if item.price and item.price.unit_amount:
                    # Convert pence to pounds
                    amount = item.price.unit_amount / 100
                    currency = item.price.currency or "gbp"
                    break
        
        logger.info(f"Payment verified successfully - Amount: {amount} {currency.upper()}, Session: {request.session_id}")
        
        return VerifySessionResponse(
            status="paid",
            amount=amount,
            currency=currency
        )
    
    except stripe.error.InvalidRequestError as e:
        logger.error(f"Invalid session ID: {e}")
        raise HTTPException(status_code=400, detail="Invalid payment session ID")
    
    except stripe.error.AuthenticationError as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=504, detail="Payment service authentication failed")
    
    except stripe.error.APIConnectionError as e:
        logger.error(f"API connection error: {e}")
        raise HTTPException(status_code=503, detail="Payment service temporarily unavailable")
    
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=510, detail="Payment service error occurred")
    
    except HTTPException:
        raise

    except Exception as e:
        logger.exception(f"Unexpected error verifying session: {e}")
        raise HTTPException(status_code=509, detail="Failed to verify payment session")


class CompletePaymentRequest(BaseModel):
    """Complete payment: verify Stripe payment and create user account."""
    payment_intent_id: str = ""
    session_id: str = ""
    name: str
    email: str
    password: str
    target_job_title: str = ""
    career_aspirations: str = ""
    selected_tier: str = "Starter"


class CompletePaymentResponse(BaseModel):
    success: bool
    candidateId: str = ""
    sessionId: str = ""
    message: str = ""


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


@router.post("/complete-payment", response_model=CompletePaymentResponse)
async def complete_payment(
    body: CompletePaymentRequest,
    session: Annotated[Session, Depends(get_db)],
) -> CompletePaymentResponse:
    """Verify Stripe payment succeeded, then create the user account.

    This is the ONLY path through which account creation happens for new users.
    Email is already verified via 6-digit code before payment, so we set email_verified=TRUE.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment service not configured.")

    if not body.name.strip() or not body.email.strip() or not body.password.strip():
        raise HTTPException(status_code=400, detail="Missing required fields.")

    if not body.session_id and not body.payment_intent_id:
        raise HTTPException(status_code=400, detail="Either session_id or payment_intent_id is required.")

    try:
        if body.session_id:
            checkout = stripe.checkout.Session.retrieve(body.session_id)
            if checkout.payment_status != "paid":
                raise HTTPException(
                    status_code=402,
                    detail=f"Payment not completed. Status: {checkout.payment_status}",
                )
        else:
            intent = stripe.PaymentIntent.retrieve(body.payment_intent_id)
            if intent.status != "succeeded":
                raise HTTPException(
                    status_code=402,
                    detail=f"Payment not completed. Status: {intent.status}",
                )
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid payment reference.")
    except stripe.error.StripeError as e:
        logger.error("Stripe error verifying payment: %s", e)
        raise HTTPException(status_code=502, detail="Could not verify payment.")

    today = date.today()
    repo = AuthRepository(session)
    candidate = repo.create_or_update_candidate(
        name=body.name.strip(),
        email=body.email.strip().lower(),
        password=hash_password(body.password),
        career_aspirations=body.career_aspirations or body.target_job_title or "",
        selected_tier=body.selected_tier,
        last_payment_date=today,
        created_at=today,
    )
    
    # ✅ FIXED: Set email_verified to TRUE since user already verified via 6-digit code
    candidate.email_verified = True
    
    user_session = repo.create_session(candidate.id, expires_in_seconds=86400)
    session.commit()

    # ✅ FIXED: No longer sending verification email - already verified via 6-digit code
    logger.info("Account created after verified payment for %s (email already verified)", body.email)

    return CompletePaymentResponse(
        success=True,
        candidateId=str(candidate.id),
        sessionId=user_session.session_token,
        message="Payment verified and account created.",
    )


class TopupCreditsRequest(BaseModel):
    session_id: str
    candidate_id: str


class TopupCreditsResponse(BaseModel):
    success: bool
    candidateId: str = ""
    creditsRemaining: int = 0
    currentStage: str = ""
    message: str = ""


@router.post("/topup-credits", response_model=TopupCreditsResponse)
async def topup_credits(
    body: TopupCreditsRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TopupCreditsResponse:
    """Top up credits for an existing user after a verified Stripe payment."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payment service not configured.")

    if not body.session_id or not body.candidate_id:
        raise HTTPException(status_code=400, detail="session_id and candidate_id are required.")

    try:
        checkout = stripe.checkout.Session.retrieve(body.session_id)
        if checkout.payment_status != "paid":
            raise HTTPException(
                status_code=402,
                detail=f"Payment not completed. Status: {checkout.payment_status}",
            )
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=400, detail="Invalid payment reference.")
    except stripe.error.StripeError as e:
        logger.error("Stripe error verifying top-up payment: %s", e)
        raise HTTPException(status_code=502, detail="Could not verify payment.")

    from sqlalchemy import text

    row = db.execute(
        text("SELECT id FROM userjourney WHERE user_id = :cid"),
        {"cid": body.candidate_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User journey not found.")

    db.execute(
        text(
            "UPDATE userjourney "
            "SET credits_remaining = 1, current_stage = 'UPLOAD_CV', "
            "    updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT "
            "WHERE user_id = :cid"
        ),
        {"cid": body.candidate_id},
    )

    today = date.today()
    db.execute(
        text("UPDATE candidates SET last_payment_date = :today WHERE id = :cid"),
        {"today": today, "cid": body.candidate_id},
    )

    db.commit()

    logger.info("Credits topped up for candidate %s", body.candidate_id)

    return TopupCreditsResponse(
        success=True,
        candidateId=body.candidate_id,
        creditsRemaining=1,
        currentStage="UPLOAD_CV",
        message="Credits topped up successfully.",
    )
