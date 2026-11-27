"""Validation and transactional writes for permanent redirects."""

import re
from collections.abc import Iterable
from dataclasses import dataclass
from urllib.parse import quote, unquote

from fastapi import HTTPException, Request
from sqlalchemy import text
from sqlmodel import Session, select

from .audit import snapshot, write_audit
from .auth import AdminPrincipal
from .models import Redirect

_INVALID_ESCAPE = re.compile(r"%(?![a-f0-9]{2})", re.IGNORECASE)
_ENCODED_SLASH = re.compile(r"%2f", re.IGNORECASE)


def normalize_redirect_path(value: str, field: str) -> str:
    def invalid(message: str) -> HTTPException:
        return HTTPException(status_code=422, detail=f"{field} {message}")

    path = value.strip()
    if not path.startswith("/") or "//" in path or ":" in path or "\\" in path:
        raise invalid("must be an internal path starting with a single '/'.")
    if "?" in path or "#" in path:
        raise invalid("must not include a query string or fragment.")
    if _INVALID_ESCAPE.search(path) or _ENCODED_SLASH.search(path):
        raise invalid("contains an invalid percent escape or an encoded slash.")
    try:
        decoded = unquote(path, errors="strict").lower()
    except UnicodeDecodeError as exc:
        raise invalid("contains invalid URL encoding.") from exc
    if any(char in decoded for char in "\\:?#%") or any(
        char.isspace() or ord(char) < 32 or ord(char) == 127 for char in decoded
    ):
        raise invalid("contains a reserved character or whitespace.")
    if any(part in {".", ".."} for part in decoded.split("/")):
        raise invalid("must not include '.' or '..' segments.")

    try:
        normalized = quote(decoded.rstrip("/") or "/", safe="/!$&'()+,;=@-._~").lower()
    except UnicodeEncodeError as exc:
        raise invalid("contains invalid URL encoding.") from exc
    if normalized.startswith(("/admin", "/api")):
        raise invalid("must not start with /admin or /api.")
    if len(normalized) > 1024:
        raise invalid("must be at most 1024 characters after normalization.")
    return normalized


@dataclass
class AddedRedirect:
    redirect: Redirect
    retargeted: list[tuple[Redirect, str]]


def audit_redirect_addition(
    session: Session,
    actor: AdminPrincipal,
    result: AddedRedirect,
    request: Request | None = None,
) -> None:
    redirect = result.redirect
    write_audit(
        session, actor, "redirect.create", "redirect", str(redirect.id),
        None, snapshot(redirect), request,
    )
    _audit_redirect_updates(session, actor, result.retargeted, request)


def _audit_redirect_updates(
    session: Session,
    actor: AdminPrincipal,
    retargeted: list[tuple[Redirect, str]],
    request: Request | None,
) -> None:
    for row, previous_target in retargeted:
        after = snapshot(row)
        write_audit(
            session, actor, "redirect.update", "redirect", str(row.id),
            {**after, "to_path": previous_target}, after, request,
        )


def lock_redirects(session: Session) -> None:
    # Serialize writers without blocking reads. All writers take this lock
    # before reading or locking rows to keep the order consistent.
    session.exec(text("LOCK TABLE redirects IN SHARE ROW EXCLUSIVE MODE"))


def _resolve_destinations(destinations: dict[str, str]) -> dict[str, str]:
    resolved: dict[str, str] = {}
    for source in destinations:
        seen: dict[str, None] = {}
        current = source
        while current in destinations and current not in resolved:
            if current in seen:
                path = list(seen)
                cycle = " → ".join([*path[path.index(current):], current])
                raise HTTPException(
                    status_code=422, detail=f"Redirects must not form a loop. Conflict: {cycle}",
                )
            seen[current] = None
            current = destinations[current]
        destination = resolved.get(current, current)
        resolved.update(dict.fromkeys(seen, destination))
    return resolved


def _retarget_redirects(
    rows: Iterable[Redirect], resolved: dict[str, str],
) -> list[tuple[Redirect, str]]:
    retargeted = []
    for row in rows:
        destination = resolved[row.from_path]
        if row.to_path != destination:
            retargeted.append((row, row.to_path))
            row.to_path = destination
    return retargeted


def add_redirect(
    session: Session, from_path: str, to_path: str, created_by: str | None
) -> AddedRedirect:
    """Insert one redirect and flatten chains. The caller owns the transaction.

    The result includes the previous target for each retargeted row so callers
    can audit those changes in the same transaction as their primary action.
    """
    source = normalize_redirect_path(from_path, "from_path")
    target = normalize_redirect_path(to_path, "to_path")
    if source == target:
        raise HTTPException(status_code=422, detail="from_path and to_path must be different.")

    lock_redirects(session)
    existing = session.exec(select(Redirect).execution_options(populate_existing=True)).all()
    destinations = {row.from_path: row.to_path for row in existing}
    if source in destinations:
        raise HTTPException(status_code=409, detail="A redirect from this path already exists.")
    destinations[source] = target
    resolved = _resolve_destinations(destinations)

    retargeted = _retarget_redirects(existing, resolved)
    redirect = Redirect(from_path=source, to_path=resolved[source], created_by=created_by)
    session.add(redirect)
    session.flush()
    return AddedRedirect(redirect, retargeted)


def redirect_course_slug(
    session: Session,
    old_slug: str,
    new_slug: str,
    actor: AdminPrincipal,
    request: Request | None = None,
) -> None:
    """Move the redirects for a course to its new live URL. The caller commits."""
    source, target = f"/courses/{old_slug}", f"/courses/{new_slug}"
    lock_redirects(session)
    rows = session.exec(select(Redirect).execution_options(populate_existing=True)).all()
    existing = {row.from_path: row for row in rows}
    obsolete = existing.pop(target, None)

    destinations = {path: row.to_path for path, row in existing.items()}
    destinations[source] = target
    resolved = _resolve_destinations(destinations)

    if obsolete is not None:
        write_audit(
            session, actor, "redirect.delete", "redirect", str(obsolete.id),
            snapshot(obsolete), None, request,
        )
        session.delete(obsolete)

    retargeted = _retarget_redirects(existing.values(), resolved)
    if source in existing:
        _audit_redirect_updates(session, actor, retargeted, request)
    else:
        redirect = Redirect(from_path=source, to_path=target, created_by=actor.name)
        session.add(redirect)
        session.flush()
        audit_redirect_addition(session, actor, AddedRedirect(redirect, retargeted), request)
