"""Test-suite bootstrap: route every DB access to TEST_DATABASE_URL only.

This module is imported by every test file. It refuses to import (raising
``RuntimeError``) unless ``TEST_DATABASE_URL`` is set to a genuinely different
database than the real one, so ``python -m unittest discover`` fails fast and
never runs anything against the real database.

The test database is expected to be migrated to the latest schema before the
suite runs:

    cd backend && DATABASE_URL=<test database URL> uv run alembic upgrade head

(the value should come from ``backend/.env.test``, which is git-ignored).
"""

import os
from pathlib import Path
from urllib.parse import urlparse

from sqlmodel import Session, create_engine, select

from backend.config import settings
from backend.db import get_session
from backend.main import app
from backend.models import LoginAttempt

_REFUSE = "Refusing to run tests against the real database"

MIGRATION_COMMAND = (
    "cd backend && DATABASE_URL=<test database URL> uv run alembic upgrade head"
)

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_TEST = _BACKEND_DIR / ".env.test"


def _load_dotenv_test() -> None:
    """Load backend/.env.test into the environment (never clobber real env vars)."""
    if not _ENV_TEST.exists():
        return
    for raw in _ENV_TEST.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def _host_of(url: str) -> str:
    return urlparse(url).hostname or ""


def _resolve_test_database_url() -> str:
    _load_dotenv_test()
    test_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    real_url = settings.database_url

    if not test_url:
        raise RuntimeError(
            f"{_REFUSE}: TEST_DATABASE_URL is not set "
            "(set the env var, or create backend/.env.test)"
        )
    if test_url == real_url:
        raise RuntimeError(f"{_REFUSE}: TEST_DATABASE_URL equals DATABASE_URL")
    if _host_of(test_url) == _host_of(real_url):
        raise RuntimeError(
            f"{_REFUSE}: TEST_DATABASE_URL shares the same host as DATABASE_URL"
        )
    return test_url


TEST_DATABASE_URL = _resolve_test_database_url()


def _engine_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


# The single engine every test must use for BOTH direct DB access and API
# requests (via the get_session override below). backend.db.engine is never used.
test_engine = create_engine(
    _engine_url(TEST_DATABASE_URL), echo=False, pool_pre_ping=True
)


def _test_get_session():
    with Session(test_engine) as session:
        yield session


# Replace the app's DB dependency so all API requests (login, admin routes, …)
# read/write the test database, not the real one.
app.dependency_overrides[get_session] = _test_get_session

# Announce only the host, never credentials or the full URL.
print(f"[tests] TEST database host: {_host_of(TEST_DATABASE_URL)}")


def reset_login_attempts() -> None:
    """Delete every login_attempts row (test DB only) so rate-limit tests start clean."""
    with Session(test_engine) as session:
        for row in session.exec(select(LoginAttempt)).all():
            session.delete(row)
        session.commit()
