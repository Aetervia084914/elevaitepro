from pydantic import BaseModel, Field


class CreateCheckoutSessionRequest(BaseModel):
    """Request to create a Stripe Checkout session for payment."""
    amount: float = Field(..., gt=0, description="Amount in pounds (GBP)")
    description: str = Field(..., description="Payment description")
    email: str = Field(..., description="Customer email")
    success_url: str = Field(..., description="URL to redirect after successful payment")
    cancel_url: str = Field(..., description="URL to redirect if payment is cancelled")


class CreateCheckoutSessionResponse(BaseModel):
    """Response containing the Stripe Checkout session URL."""
    session_id: str = Field(..., description="Stripe session ID")
    checkout_url: str = Field(..., description="URL to redirect user to Stripe Checkout")


class PaymentStatus(BaseModel):
    """Payment status information."""
    status: str = Field(..., description="Payment status (succeeded, pending, failed, etc.)")
    session_id: str = Field(..., description="Stripe session ID")
    amount: float = Field(..., description="Amount charged in pounds")
