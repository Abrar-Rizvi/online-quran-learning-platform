from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    frontend_url: Optional[str] = None
    allowed_origins: str = ""
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.3-70b-versatile"
    registration_form_url: Optional[str] = None
    whatsapp_link: Optional[str] = None
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None
    jwt_secret_key: Optional[str] = None
    # Public POST /chat is only registered when this is true (off until the chatbot is hardened).
    chat_enabled: bool = False
    # Behind Railway's edge proxy: take the client IP from the right-most X-Forwarded-For entry
    # (the one the proxy itself appended). Leave false when the app is reached directly (local dev).
    trust_proxy_headers: bool = False
    # "development" shows /docs and allows http://localhost:3000; anything else — including
    # unset — is treated as "production" (secure by default).
    app_env: str = "production"

    @field_validator("app_env", mode="before")
    @classmethod
    def _normalize_app_env(cls, value: object) -> str:
        return "development" if str(value or "").strip().lower() == "development" else "production"

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    def secret_problems(self) -> list[str]:
        """Weak or missing admin secrets, described by variable NAME only (never the value)."""
        problems = []
        if not self.jwt_secret_key or len(self.jwt_secret_key) < 32:
            problems.append("JWT_SECRET_KEY must be set and at least 32 characters long")
        if not self.admin_username:
            problems.append("ADMIN_USERNAME must be set")
        if not self.admin_password or len(self.admin_password) < 12:
            problems.append("ADMIN_PASSWORD must be set and at least 12 characters long")
        return problems


settings = Settings()
