import math

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from ..auth import (
    admin_auth_configured,
    check_admin_credentials,
    create_access_token,
)
from ..db import get_session
from ..models import AdminRole, AdminUser
from ..models.student import utcnow
from ..rate_limit import SlidingWindowRateLimiter, client_ip, too_many_requests
from ..schemas import LoginRequest, TokenResponse
from ..security import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# At most 5 FAILED attempts per client IP per 15 minutes. Successful logins
# aren't counted and don't clear earlier failures: a success only happens with
# the right password, so resetting would add nothing but complexity.
login_failures = SlidingWindowRateLimiter(max_requests=5, window_seconds=15 * 60)


def _locked_out(retry_after: float) -> HTTPException:
    minutes = max(1, math.ceil(retry_after / 60))
    unit = "minute" if minutes == 1 else "minutes"
    return too_many_requests(f"Too many login attempts. Please try again in {minutes} {unit}.", retry_after)


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


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, session: Session = Depends(get_session)) -> TokenResponse:
    ip = client_ip(request)
    retry_after = login_failures.retry_after(ip)
    if retry_after is not None:
        raise _locked_out(retry_after)

    # 1) Env-based owner, exactly as before (owner behaviour + 8h lifetime unchanged).
    if admin_auth_configured() and check_admin_credentials(payload.username, payload.password):
        return TokenResponse(
            access_token=create_access_token(payload.username, role=AdminRole.OWNER.value)
        )

    # 2) Otherwise treat `username` as an email and check an ACTIVE admin_users row.
    user = _find_active_db_user(session, payload.username)
    if user is not None and verify_password(payload.password, user.password_hash):
        user.last_login_at = utcnow()
        session.add(user)
        session.commit()
        return TokenResponse(
            access_token=create_access_token(
                user.email, role=user.role, user_id=user.id
            )
        )

    login_failures.record(ip)
    raise _invalid_credentials()
