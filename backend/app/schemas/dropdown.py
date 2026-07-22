from pydantic import BaseModel, Field


class DropdownItem(BaseModel):
    label: str = Field(min_length=1)
    value: str = Field(min_length=1)


class DropdownResponse(BaseModel):
    items: list[DropdownItem]
