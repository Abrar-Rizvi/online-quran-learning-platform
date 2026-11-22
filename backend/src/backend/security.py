"""Password hashing helpers for admin DB users.

Uses the same bcrypt backend (via passlib) already in use for the env-based
owner password, so no new dependency is introduced.
"""

from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Return a bcrypt hash of ``password`` for storage in ``password_hash``."""
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return True when ``password`` matches ``password_hash``.

    Malformed hashes are treated as a mismatch rather than raising, so an
    unexpected stored value can never turn into a 500 on login.
    """
    try:
        return _pwd_context.verify(password, password_hash)
    except (ValueError, TypeError):
        return False
