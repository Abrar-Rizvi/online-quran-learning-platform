from typing import Optional

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


settings = Settings()
