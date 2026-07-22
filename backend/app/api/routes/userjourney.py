from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.userjourney_repository import UserJourneyRepository
from app.schemas.userjourney import UserJourneyInfo, UserJourneyRequest, UserJourneyResponse

router = APIRouter(tags=["userjourney"])


def _to_info(row: dict | None) -> UserJourneyInfo | None:
    if not row:
        return None

    return UserJourneyInfo(
        id=str(row["id"]),
        userId=str(row["user_id"]),
        currentStage=row["current_stage"],
        creditsRemaining=row["credits_remaining"],
        cvUploaded=bool(row.get("cv_uploaded", False)),
        analysisCompletedAt=row.get("analysis_completed_at"),
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


@router.get("/userjourney", response_model=UserJourneyResponse)
def get_user_journey(
    session: Annotated[Session, Depends(get_db)],
    userId: Annotated[UUID | None, Query()] = None,
    candidateId: Annotated[UUID | None, Query()] = None,
) -> UserJourneyResponse:
    user_id = userId or candidateId
    if not user_id:
        raise HTTPException(status_code=400, detail="A valid userId or candidateId is required.")

    repo = UserJourneyRepository(session)
    journey = repo.get_by_user_id(user_id)
    return UserJourneyResponse(success=True, userJourney=_to_info(journey))


@router.post("/userjourney", response_model=UserJourneyResponse)
def save_user_journey(
    body: UserJourneyRequest,
    session: Annotated[Session, Depends(get_db)],
) -> UserJourneyResponse:
    user_id = body.resolved_user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="A valid userId or candidateId is required.")

    repo = UserJourneyRepository(session)
    journey = repo.upsert(
        user_id=user_id,
        current_stage=body.resolved_current_stage,
        credits_remaining=body.resolved_credits_remaining,
    )
    session.commit()

    return UserJourneyResponse(success=True, userJourney=_to_info(journey))
