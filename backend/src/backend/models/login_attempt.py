from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from .student import utcnow


class LoginAttempt(SQLModel, table=True):
    """One row per ``POST /auth/login`` attempt (success or failure).

    Used for the per-username and per-IP brute-force lockout. ``username`` is
    the trimmed, lower-cased login identifier (owner username or DB-user
    email); ``ip`` is the forwarded visitor IP (nullable). Rows older than 24
    hours are purged lazily on each login.
    """

    __tablename__ = "login_attempts"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow, index=True)
    username: str = Field(index=True)
    ip: Optional[str] = Field(default=None, index=True)
    success: bool = Field(default=False, index=True)
