"""Admin authentication: env-based owner + DB-backed admin users.

The single-owner env credentials (``ADMIN_USERNAME`` / ``ADMIN_PASSWORD``)
are checked exactly as before and still issue an owner token. In addition,
``admin_users`` rows can sign in with ``email`` + password; those tokens carry
a ``uid`` claim so the user is re-checked (exists + active) on every request.
JWTs carry the subject, role and (for DB users) user id, with a short lifetime.
"""

import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlmodel import Session

from .config import settings
from .db import get_session
from .models import AdminUser, AdminRole

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _hash_of(password: str) -> str:
    """bcrypt hash of the configured ADMIN_PASSWORD, computed once and reused."""
    return pwd_context.hash(password)


# Checked instead of the real hash when the username is wrong, so every login
# attempt costs exactly one bcrypt verification (no timing hint about usernames).
_DUMMY_HASH = pwd_context.hash(secrets.token_urlsafe(32))


def admin_auth_configured() -> bool:
    return bool(settings.admin_username and settings.admin_password)


def warm_admin_hash() -> None:
    """Hash ADMIN_PASSWORD at startup so the first login isn't slower than the rest."""
    if settings.admin_password:
        _hash_of(settings.admin_password)


def check_admin_credentials(username: str, password: str) -> bool:
    """True only if both match. Always runs one bcrypt verify, right username or not."""
    if not admin_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin authentication is not configured.",
        )
    username_ok = hmac.compare_digest(username.encode(), settings.admin_username.encode())
    target = _hash_of(settings.admin_password) if username_ok else _DUMMY_HASH
    try:
        password_ok = pwd_context.verify(password, target)
    except (ValueError, TypeError):
        password_ok = False
    return username_ok and password_ok


def create_access_token(
    username: str,
    expires_delta: Optional[timedelta] = None,
    *,
    role: str = AdminRole.OWNER.value,
    user_id: Optional[int] = None,
) -> str:
    """Create a signed JWT for an admin with a short expiration.

    ``sub`` is the login identifier (owner username or DB user's email). DB
    users also get a ``uid`` claim; its absence marks the token as the
    env-based owner. ``role`` is always written so a decoded token can be
    authorised without another lookup.
    """
    if not settings.jwt_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT signing is not configured.",
        )

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    payload = {
        "sub": username,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
        "role": role,
    }
    if user_id is not None:
        payload["uid"] = user_id
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT, raising 401 if invalid or expired."""
    try:
        if not settings.jwt_secret_key:
            raise jwt.PyJWTError("JWT signing is not configured.")
        return jwt.decode(
            token, settings.jwt_secret_key, algorithms=[ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@dataclass(frozen=True)
class AdminPrincipal:
    """The authenticated admin behind a request.

    ``user_id`` is ``None`` for the env-based owner; DB users carry their
    ``admin_users.id`` and their name/email/role come from the database (so a
    deactivation or role change is honoured immediately).
    """

    user_id: Optional[int]
    name: str
    email: Optional[str]
    role: str


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
    session: Session = Depends(get_session),
) -> AdminPrincipal:
    """FastAPI dependency that returns the authenticated admin principal.

    Extracts the bearer token and verifies it; raises 401 when the token is
    missing, malformed, invalid or expired. Tokens without a ``uid`` claim are
    the env-based owner (role defaults to ``owner``); tokens with a ``uid``
    are re-checked against ``admin_users`` on every request so deactivation
    takes effect immediately even with a still-valid token.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = payload.get("role") or AdminRole.OWNER.value
    user_id = payload.get("uid")

    if user_id is None:
        return AdminPrincipal(user_id=None, name=username, email=None, role=role)

    user = session.get(AdminUser, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AdminPrincipal(
        user_id=user.id, name=user.name, email=user.email, role=user.role
    )


def require_roles(*roles: str):
    """Dependency factory: 403 unless the current admin holds one of ``roles``.

    Applied at the router level for owner-only /admin routes (fail-closed
    default) and overridden on the blog router for ``owner`` + ``seo_editor``.
    """

    allowed = set(roles)

    def _require(
        principal: AdminPrincipal = Depends(get_current_admin),
    ) -> AdminPrincipal:
        if principal.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return principal

    return _require
