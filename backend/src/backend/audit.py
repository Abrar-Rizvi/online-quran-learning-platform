"""Shared audit-log helper used by every mutating /admin endpoint.

The intent is one small, single place that builds an ``AuditLog`` row and adds
it to the *current* session (the caller commits), so the audit record is
written in the same transaction as the change it describes — never separately.

Nothing here ever captures a password or its hash: ``snapshot`` walks the
model's column attributes and skips ``password_hash`` (and the unguessable
``confirmation_token``), and password resets are recorded as a marker only.
"""

from datetime import datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import inspect as sa_inspect
from sqlmodel import Session

from .auth import AdminPrincipal
from .models.audit_log import AuditLog

# Columns that must never reach the audit log.
_SKIP_FIELDS = frozenset({"password_hash", "confirmation_token"})


def forwarded_client_ip(request: Request) -> str:
    """The visitor IP as forwarded by the Next.js server.

    The Next.js server forwards the visitor's IP as the first X-Forwarded-For
    entry. If the backend is publicly reachable a caller could spoof this
    header, so it must never be the sole protection (for login, the
    per-username limit is the primary control). Falls back to the TCP peer.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def _jsonable(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    return value


def snapshot(instance: Any) -> dict:
    """Serialize a model instance's column values to a JSON-safe dict.

    Relationship attributes are skipped (column attributes only), and
    ``password_hash`` / ``confirmation_token`` are always excluded.
    """
    data: dict = {}
    for prop in sa_inspect(instance).mapper.column_attrs:
        key = prop.key
        if key in _SKIP_FIELDS:
            continue
        data[key] = _jsonable(getattr(instance, key))
    return data


def write_audit(
    session: Session,
    principal: AdminPrincipal,
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Add one ``AuditLog`` row to ``session`` (caller commits it).

    ``actor_user_id`` is ``principal.user_id`` (None for the env owner);
    ``ip`` comes from ``forwarded_client_ip`` when a request is available.
    """
    session.add(
        AuditLog(
            actor_user_id=principal.user_id,
            actor_name=principal.name,
            actor_role=principal.role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            ip=forwarded_client_ip(request) if request is not None else None,
        )
    )
