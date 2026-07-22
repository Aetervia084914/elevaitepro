from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Industry, Occupation, Skill, SkillOccupation


class DropdownRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_industries(self) -> list[str]:
        statement = (
            select(Industry.name)
            .where(func.length(func.btrim(Industry.name)) > 0)
            .order_by(func.lower(Industry.name))
        )
        rows = self.session.execute(statement).scalars().all()
        return self._normalize_distinct(rows)

    def get_job_titles_by_industry(self, industry_name: str) -> list[str]:
        normalized_industry = industry_name.strip()
        statement = (
            select(Occupation.name)
            .join(SkillOccupation, SkillOccupation.occupation_id == Occupation.id)
            .join(Skill, Skill.skill_id == SkillOccupation.skill_id)
            .join(Industry, Industry.id == Skill.industry_id)
            .where(func.lower(Industry.name) == func.lower(normalized_industry))
            .where(func.length(func.btrim(Occupation.name)) > 0)
            .order_by(func.lower(Occupation.name))
        )
        rows = self.session.execute(statement).scalars().all()
        return self._normalize_distinct(rows)

    @staticmethod
    def _normalize_distinct(values: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for value in values:
            item = (value or "").strip()
            if not item:
                continue
            key = item.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(item)
        cleaned.sort(key=str.casefold)
        return cleaned
