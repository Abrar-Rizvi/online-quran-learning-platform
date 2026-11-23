"""Schemas for admin users (create/update bodies + list/read views)."""

import re
from datetime import datetime
from typing import Optional

from pydantic import ConfigDict, field_validator
from sqlmodel import Field, SQLModel

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")

MIN_PASSWORD_LENGTH = 10


class AdminUserCreate(SQLModel):
    """Body for ``POST /admin/users``.

    The API always creates a ``seo_editor`` (it can never create an owner), so
    no ``role``/``is_active`` field is accepted: extra fields (including
    ``role``) are rejected with 422 rather than silently honoured.
    """

    model_config = ConfigDict(extra="forbid")

    name: str
    email: str
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)

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


class AdminUserUpdate(SQLModel):
    """Partial (PATCH) body for ``PATCH /admin/users/{id}``.

    Only supplied fields are applied. ``password`` is a reset (min 10 chars,
    re-hashed); a null password is treated as "no change".
    """

    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=MIN_PASSWORD_LENGTH)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        name = value.strip()
        if not name:
            raise ValueError("name must not be blank")
        return name


class AdminUserRead(SQLModel):
    """One row of ``GET /admin/users`` (never includes ``password_hash``)."""

    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime


class AdminMeRead(SQLModel):
    """Response for ``GET /admin/me`` (email is None for the env owner)."""

    name: str
    email: Optional[str] = None
    role: str
