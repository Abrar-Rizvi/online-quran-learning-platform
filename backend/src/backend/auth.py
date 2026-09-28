"""Single-admin authentication helpers.

Passwords stored in ``ADMIN_PASSWORD`` are plain text (filled in by the
owner); they are hashed with bcrypt once (cached) rather than requiring a
pre-hashed value. JWTs carry the admin username and a short lifetime.
"""

import hmac
import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from .config import settings

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
    username: str, expires_delta: Optional[timedelta] = None
) -> str:
    """Create a signed JWT for the admin user with a short expiration."""
    if not settings.jwt_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT signing is not configured.",
        )

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    payload = {"sub": username, "iat": datetime.now(timezone.utc), "exp": expire}
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


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> str:
    """FastAPI dependency that returns the authenticated admin username.

    Extracts the bearer token from the Authorization header and verifies it;
    raises 401 when the token is missing, malformed, invalid or expired.
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
    return username
