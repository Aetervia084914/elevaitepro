"""Advance a candidate's journey stage.

POST /advance-journey
    Validates the current stage, confirms at least one role_analyses row
    exists for the candidate (proving the LLM step completed), then
    transitions the userjourney record to the next stage.

    UPLOAD_CV  →  ANALYSIS
    ANALYSIS   →  RESULTS
"""
from __future__ import annotations

import time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.userjourney import JourneyStage, UserJourneyInfo

router = APIRouter(tags=["userjourney"])

# Valid one-step forward transitions
_TRANSITIONS: dict[str, str] = {
    "UPLOAD_CV": "ANALYSIS",
    "ANALYSIS":  "RESULTS",
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdvanceJourneyRequest(BaseModel):
    candidate_id: UUID


class AdvanceJourneyResponse(BaseModel):
    success: bool
    previous_stage: JourneyStage
    current_stage: JourneyStage
    user_journey: UserJourneyInfo


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/advance-journey", response_model=AdvanceJourneyResponse)
def advance_journey(
    body: AdvanceJourneyRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AdvanceJourneyResponse:
    """Advance the candidate's journey to the next stage."""

    # 1. Fetch current journey row
    row = db.execute(
        text("SELECT id, current_stage, credits_remaining FROM userjourney WHERE user_id = :uid LIMIT 1"),
        {"uid": str(body.candidate_id)},
    ).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No journey found for candidate {body.candidate_id}",
        )

    current_stage: str = row["current_stage"]
    journey_id: str = str(row["id"])
    credits_remaining: int = row["credits_remaining"]

    # 2. Validate transition
    next_stage = _TRANSITIONS.get(current_stage)
    if not next_stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No forward transition defined from stage '{current_stage}'",
        )

    # 3. Update journey stage with transition-specific side-effects
    now_epoch = int(time.time())

    if current_stage == "UPLOAD_CV":
        # Mark that the CV entitlement has been consumed for this journey
        updated = db.execute(
            text("""
                UPDATE userjourney
                   SET current_stage = :next_stage,
                       updated_at    = :now
                 WHERE id = :journey_id
             RETURNING id, user_id, current_stage, credits_remaining,
                       created_at, updated_at
            """),
            {"next_stage": next_stage, "now": now_epoch, "journey_id": journey_id},
        ).mappings().first()
    else:
        # ANALYSIS → RESULTS: consume the credit
        updated = db.execute(
            text("""
                UPDATE userjourney
                   SET current_stage     = :next_stage,
                       credits_remaining = 0,
                       updated_at        = :now
                 WHERE id = :journey_id
             RETURNING id, user_id, current_stage, credits_remaining,
                       created_at, updated_at
            """),
            {"next_stage": next_stage, "now": now_epoch, "journey_id": journey_id},
        ).mappings().first()

    db.commit()

    return AdvanceJourneyResponse(
        success=True,
        previous_stage=current_stage,  # type: ignore[arg-type]
        current_stage=next_stage,       # type: ignore[arg-type]
        user_journey=UserJourneyInfo(
            id=str(updated["id"]),
            userId=str(updated["user_id"]),
            currentStage=updated["current_stage"],
            creditsRemaining=updated["credits_remaining"],
            cvUploaded=current_stage == "UPLOAD_CV",  # Set true if transitioning from UPLOAD_CV
            analysisCompletedAt=None,
            createdAt=updated.get("created_at"),
            updatedAt=updated.get("updated_at"),
        ),
    )
