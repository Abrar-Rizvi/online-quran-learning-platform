from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel

from .student import utcnow


class AdminRole(str, Enum):
    """The only valid values for ``admin_users.role``.

    Mirrors the DB-level CHECK constraint ``ck_admin_users_role``.
    """

    OWNER = "owner"
    SEO_EDITOR = "seo_editor"


# New admin users default to the least-privileged role (an owner must promote
# them explicitly). User-management endpoints arrive in a later part.
DEFAULT_ADMIN_ROLE = AdminRole.SEO_EDITOR

VALID_ADMIN_ROLES = frozenset(r.value for r in AdminRole)


class AdminUser(SQLModel, table=True):
    """A person who can sign in to the admin panel (owner or SEO editor).

    ``email`` is the login identifier for DB users (stored trimmed + lower-cased
    by the creation layer); ``password_hash`` is a bcrypt hash and must never be
    returned by any endpoint.
    """

    __tablename__ = "admin_users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner','seo_editor')", name="ck_admin_users_role"
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: str = Field(default=DEFAULT_ADMIN_ROLE.value)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column_kwargs={"onupdate": utcnow}
    )
    last_login_at: Optional[datetime] = Field(default=None)
