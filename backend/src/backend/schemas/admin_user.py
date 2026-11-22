"""Schemas for admin users (creation body + the ``GET /admin/me`` view)."""

import re
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from ..models.admin_user import AdminRole

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

MIN_PASSWORD_LENGTH = 10


class AdminUserCreate(SQLModel):
    """Body used to create an ``admin_users`` row (user-management endpoints
    arrive in a later part; the schema is defined now so the password-length
    rule is enforced in one place)."""

    name: str
    email: str
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    role: AdminRole = AdminRole.SEO_EDITOR
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("name must not be blank")
        return name

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not _EMAIL_RE.fullmatch(normalized):
            raise ValueError("must be a valid email address")
        return normalized


class AdminMeRead(SQLModel):
    """Response for ``GET /admin/me`` (email is None for the env owner)."""

    name: str
    email: Optional[str] = None
    role: str
