import re
from datetime import datetime
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

# Deliberately light: exactly one "@", no whitespace, and a dot in the domain.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class TrialRequestCreate(SQLModel):
    name: str = Field(min_length=1)
    email: str
    whatsapp: str = Field(min_length=1)
    country: Optional[str] = None

    @field_validator("name", "email", "whatsapp", "country", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        value = value.lower()
        if not _EMAIL_RE.match(value):
            raise ValueError("Enter a valid email address")
        return value

    @field_validator("country")
    @classmethod
    def _blank_country_is_none(cls, value: Optional[str]) -> Optional[str]:
        return value or None


class TrialRequestRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    whatsapp: str
    country: Optional[str] = None
    status: str
    created_at: datetime
