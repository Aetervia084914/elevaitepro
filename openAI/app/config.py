from __future__ import annotations

from pydantic import BaseModel

from .aws_secrets import get_secrets


_secrets = get_secrets()


class Settings(BaseModel):
    openai_api_key: str = _secrets.get("OPENAI_API_KEY", "")
    openai_model: str = _secrets.get("OPENAI_MODEL", "gpt-4o-mini")
    host: str = _secrets.get("HOST", "0.0.0.0")
    port: int = int(_secrets.get("PORT", "8005"))


settings = Settings()
