from __future__ import annotations

import math
import time
import uuid
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import Candidate, UserSession


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def email_exists(self, email: str) -> bool:
        result = self._session.execute(
            text("SELECT 1 FROM candidates WHERE email = :email"),
            {"email": email},
        )
        return result.fetchone() is not None

    def get_candidate_by_email(self, email: str) -> Candidate | None:
        return (
            self._session.query(Candidate)
            .filter(Candidate.email == email)
            .first()
        )

    def create_or_update_candidate(
        self,
        name: str,
        email: str,
        password: str,
        career_aspirations: str,
        selected_tier: str,
        last_payment_date: date | None,
        created_at: date,
    ) -> Candidate:
        candidate = self.get_candidate_by_email(email)
        if candidate:
            candidate.password = password
            candidate.career_aspirations = career_aspirations
            candidate.selected_tier = selected_tier
            candidate.last_payment_date = last_payment_date
            candidate.created_at = created_at
        else:
            candidate = Candidate(
                id=uuid.uuid4(),
                name=name,
                email=email,
                password=password,
                career_aspirations=career_aspirations,
                selected_tier=selected_tier,
                last_payment_date=last_payment_date,
                created_at=created_at,
            )
            self._session.add(candidate)
        self._session.flush()
        return candidate

    def create_session(self, candidate_id: uuid.UUID, expires_in_seconds: int) -> UserSession:
        now = math.floor(time.time())
        session_token = str(uuid.uuid4())
        user_session = UserSession(
            id=uuid.uuid4(),
            user_id=candidate_id,
            session_token=session_token,
            created_at=now,
            expires_at=now + expires_in_seconds,
        )
        self._session.add(user_session)
        self._session.flush()
        return user_session

    def delete_session_by_token(self, session_token: str) -> None:
        self._session.execute(
            text("DELETE FROM usersession WHERE session_token = :token"),
            {"token": session_token},
        )
