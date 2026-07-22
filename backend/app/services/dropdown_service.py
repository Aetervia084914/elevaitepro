from app.repositories.dropdown_repository import DropdownRepository
from app.schemas.dropdown import DropdownItem, DropdownResponse


class DropdownService:
    def __init__(self, repository: DropdownRepository) -> None:
        self.repository = repository

    def get_industries(self) -> DropdownResponse:
        items = self.repository.get_industries()
        return self._build_response(items)

    def get_job_titles_by_industry(self, industry_name: str) -> DropdownResponse:
        normalized = industry_name.strip()
        items = self.repository.get_job_titles_by_industry(normalized)
        return self._build_response(items)

    @staticmethod
    def _build_response(values: list[str]) -> DropdownResponse:
        return DropdownResponse(items=[DropdownItem(label=value, value=value) for value in values])
