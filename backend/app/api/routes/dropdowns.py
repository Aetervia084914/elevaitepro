from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.dropdown_repository import DropdownRepository
from app.schemas.dropdown import DropdownResponse
from app.services.dropdown_service import DropdownService


router = APIRouter(prefix="/api/v1/dropdowns", tags=["dropdowns"])


def get_dropdown_service(session: Annotated[Session, Depends(get_db)]) -> DropdownService:
    repository = DropdownRepository(session)
    return DropdownService(repository)


@router.get("/industries", response_model=DropdownResponse)
def get_industries(service: Annotated[DropdownService, Depends(get_dropdown_service)]) -> DropdownResponse:
    return service.get_industries()


@router.get("/job-titles", response_model=DropdownResponse)
def get_job_titles(
    industry: Annotated[str, Query(min_length=1, max_length=255)],
    service: Annotated[DropdownService, Depends(get_dropdown_service)],
) -> DropdownResponse:
    if not industry.strip():
        raise HTTPException(status_code=422, detail="industry query parameter must not be blank")
    return service.get_job_titles_by_industry(industry)
