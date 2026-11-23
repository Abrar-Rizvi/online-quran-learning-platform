"""Owner-only audit-log listing."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlmodel import Session, select

from ..auth import require_roles
from ..db import get_session
from ..models import AuditLog
from ..schemas.audit_log import AuditLogPage, AuditLogRead

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles("owner"))],
)


@router.get("/audit-log", response_model=AuditLogPage)
def list_audit_log(
    actor_user_id: Optional[int] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> AuditLogPage:
    query = select(AuditLog)
    if actor_user_id is not None:
        query = query.where(AuditLog.actor_user_id == actor_user_id)
    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)

    total = session.exec(
        select(func.count()).select_from(query.subquery())
    ).one()

    rows = session.exec(
        query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return AuditLogPage(
        items=[AuditLogRead.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )
