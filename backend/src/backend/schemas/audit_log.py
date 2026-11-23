"""Schemas for the owner-only audit-log listing."""

from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel


class AuditLogRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    created_at: datetime
    actor_user_id: Optional[int] = None
    actor_name: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    before: Optional[dict] = None
    after: Optional[dict] = None
    ip: Optional[str] = None


class AuditLogPage(SQLModel):
    items: list[AuditLogRead]
    total: int
    limit: int
    offset: int
