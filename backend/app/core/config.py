from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.aws_secrets import get_secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = Field(validation_alias="DATABASE_URL")
    fastapi_host: str = Field(default="127.0.0.1", validation_alias="FASTAPI_HOST")
    fastapi_port: int = Field(default=8002, validation_alias="FASTAPI_PORT")

    # Skill normalizer — LLM fallback (Stage 5)
    openai_api_key: str = Field(default="", validation_alias="OPENAI_API_KEY")
    llm_base_url: str = Field(default="http://localhost:8005", validation_alias="LLM_BASE_URL")
    llm_endpoint: str = Field(default="/openchat", validation_alias="LLM_ENDPOINT")
    llm_model: str = Field(default="gpt-5.4", validation_alias="LLM_MODEL")

    # Email verification — SMTP (Office 365)
    smtp_host: str = Field(default="smtp.office365.com", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str = Field(default="", validation_alias="SMTP_USER")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    smtp_from_name: str = Field(default="elevAIte pro", validation_alias="SMTP_FROM_NAME")
    mail_from: str = Field(default="", validation_alias="MAIL_FROM")
    mail_to: str = Field(default="", validation_alias="MAIL_TO")
    email_verification_secret: str = Field(default="change-me-in-production", validation_alias="EMAIL_VERIFICATION_SECRET")
    email_verification_expiry_hours: int = Field(default=24, validation_alias="EMAIL_VERIFICATION_EXPIRY_HOURS")
    frontend_base_url: str = Field(validation_alias="FRONTEND_BASE_URL")

    # Verification code — file-system encrypted store
    verification_encryption_key: str = Field(default="", validation_alias="VERIFICATION_ENCRYPTION_KEY")
    verification_pepper: str = Field(default="", validation_alias="VERIFICATION_PEPPER")

    # Stripe
    stripe_public_key: str = Field(default="", validation_alias="STRIPE_PUBLIC_KEY")
    stripe_secret_key: str = Field(default="", validation_alias="STRIPE_SECRET_KEY")

    # RDS SSL
    rds_ca_path: str = Field(default="", validation_alias="RDS_CA_PATH")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    secrets = get_secrets()
    return Settings(**secrets)
