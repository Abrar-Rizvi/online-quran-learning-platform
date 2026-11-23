import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from ..audit import forwarded_client_ip
from ..auth import (
    admin_auth_configured,
    check_admin_credentials,
    create_access_token,
)
from ..db import get_session
from ..models import AdminRole, AdminUser, LoginAttempt
from ..models.student import utcnow
from ..rate_limit import too_many_requests
from ..schemas import LoginRequest, TokenResponse
from ..security import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# At most 5 FAILED attempts per username (or per IP) in the last 15 minutes.
# The count is stored in the ``login_attempts`` table so it survives restarts
# and is shared across processes; rows older than 24 hours are purged lazily.
LOCKOUT_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW = timedelta(minutes=15)
ATTEMPT_RETENTION = timedelta(hours=24)


def _utcnow_naive() -> datetime:
    """Naive UTC now, matching how ``login_attempts.created_at`` is read back
    from the database (a ``DateTime`` column without timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _locked_out(retry_after: float) -> HTTPException:
    minutes = max(1, math.ceil(retry_after / 60))
    unit = "minute" if minutes == 1 else "minutes"
    return too_many_requests(
        f"Too many login attempts. Please try again in {minutes} {unit}.",
        retry_after,
    )


def _invalid_credentials() -> HTTPException:
    # Generic message on purpose — do not reveal which field was wrong.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _find_active_db_user(session: Session, username: str) -> AdminUser | None:
    email = username.strip().lower()
    return session.exec(
        select(AdminUser).where(
            AdminUser.email == email, AdminUser.is_active == True  # noqa: E712
        )
    ).first()


def _record_attempt(session: Session, username: str, ip: str, success: bool) -> None:
    session.add(LoginAttempt(username=username, ip=ip, success=success))


def _clear_failed_attempts(session: Session, username: str) -> None:
    """A successful login resets that username's failure counter."""
    for row in session.exec(
        select(LoginAttempt).where(
            LoginAttempt.username == username, LoginAttempt.success == False  # noqa: E712
        )
    ).all():
        session.delete(row)


def _purge_old_attempts(session: Session) -> None:
    cutoff = _utcnow_naive() - ATTEMPT_RETENTION
    for row in session.exec(
        select(LoginAttempt).where(LoginAttempt.created_at < cutoff)
    ).all():
        session.delete(row)


def _failure_times(
    session: Session, *, username: str | None = None, ip: str | None = None
) -> list:
    cutoff = _utcnow_naive() - LOCKOUT_WINDOW
    query = select(LoginAttempt.created_at).where(
        LoginAttempt.success == False,  # noqa: E712
        LoginAttempt.created_at >= cutoff,
    )
    if username is not None:
        query = query.where(LoginAttempt.username == username)
    if ip is not None:
        query = query.where(LoginAttempt.ip == ip)
    return session.exec(query.order_by(LoginAttempt.created_at)).all()


def _retry_after_for(times: list) -> float | None:
    """Seconds until a lockout (>= 5 failures) clears, else None.

    ``times`` is ascending; the lockout ends when the 5th-most-recent failure
    ages out of the 15-minute window.
    """
    if len(times) < LOCKOUT_FAILED_ATTEMPTS:
        return None
    oldest = times[-LOCKOUT_FAILED_ATTEMPTS]
    if oldest.tzinfo is not None:
        oldest = oldest.replace(tzinfo=None)
    return max(0.0, (oldest + LOCKOUT_WINDOW - _utcnow_naive()).total_seconds())


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> TokenResponse:
    # The Next.js server forwards the visitor IP in the first X-Forwarded-For
    # entry; if the backend is publicly reachable a caller could spoof that
    # header, so the per-username limit below is the primary protection.
    ip = forwarded_client_ip(request)
    normalized = payload.username.strip().lower()

    _purge_old_attempts(session)

    # Lockout is checked BEFORE the password is verified, for owner and DB-user
    # logins alike, so a valid password is refused during a lockout too.
    user_retry = _retry_after_for(_failure_times(session, username=normalized))
    ip_retry = _retry_after_for(_failure_times(session, ip=ip))
    retry_after = max(
        (r for r in (user_retry, ip_retry) if r is not None), default=None
    )
    if retry_after is not None:
        raise _locked_out(retry_after)

    # 1) Env-based owner, exactly as before (owner behaviour + 8h lifetime unchanged).
    if admin_auth_configured() and check_admin_credentials(payload.username, payload.password):
        _record_attempt(session, normalized, ip, success=True)
        _clear_failed_attempts(session, normalized)
        session.commit()
        return TokenResponse(
            access_token=create_access_token(payload.username, role=AdminRole.OWNER.value)
        )

    # 2) Otherwise treat `username` as an email and check an ACTIVE admin_users row.
    user = _find_active_db_user(session, normalized)
    if user is not None and verify_password(payload.password, user.password_hash):
        user.last_login_at = utcnow()
        session.add(user)
        _record_attempt(session, normalized, ip, success=True)
        _clear_failed_attempts(session, normalized)
        session.commit()
        return TokenResponse(
            access_token=create_access_token(
                user.email, role=user.role, user_id=user.id
            )
        )

    _record_attempt(session, normalized, ip, success=False)
    session.commit()
    raise _invalid_credentials()
