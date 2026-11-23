from datetime import datetime
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from .student import utcnow


class AuditLog(SQLModel, table=True):
    """One row per mutating admin action (who changed what, when, from/to).

    ``actor_user_id`` is null for the env-based owner (which has no
    ``admin_users`` row); ``before``/``after`` are JSON snapshots of the
    entity's column values so a change can be understood/reverted later.
    Passwords and hashes are never stored (the audit writer excludes them).
    """

    __tablename__ = "audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utcnow, index=True)
    actor_user_id: Optional[int] = Field(default=None, index=True)
    actor_name: str
    actor_role: str
    action: str = Field(index=True)
    entity_type: str
    entity_id: Optional[str] = Field(default=None)
    before: Optional[dict] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    after: Optional[dict] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    ip: Optional[str] = Field(default=None)
