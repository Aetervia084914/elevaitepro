from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    postgres: str
    postgres_error: str | None = None
