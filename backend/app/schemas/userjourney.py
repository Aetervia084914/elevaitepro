from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

JourneyStage = Literal["UPLOAD_CV", "ANALYSIS", "RESULTS"]


class UserJourneyRequest(BaseModel):
    userId: UUID | None = None
    user_id: UUID | None = None
    candidateId: UUID | None = None
    candidate_id: UUID | None = None
    currentStage: str | None = None
    current_stage: str | None = None
    creditsRemaining: int | None = Field(default=None, ge=0)
    credits_remaining: int | None = Field(default=None, ge=0)

    @property
    def resolved_user_id(self) -> UUID | None:
        return self.userId or self.user_id or self.candidateId or self.candidate_id

    @property
    def resolved_current_stage(self) -> str:
        return self.currentStage or self.current_stage or "UPLOAD_CV"

    @property
    def resolved_credits_remaining(self) -> int:
        value = self.creditsRemaining if self.creditsRemaining is not None else self.credits_remaining
        return 1 if value is None else value


class UserJourneyInfo(BaseModel):
    id: str
    userId: str
    currentStage: str
    creditsRemaining: int
    cvUploaded: bool = False
    analysisCompletedAt: int | None = None
    createdAt: int | None = None
    updatedAt: int | None = None


class UserJourneyResponse(BaseModel):
    success: bool
    userJourney: UserJourneyInfo | None = None
