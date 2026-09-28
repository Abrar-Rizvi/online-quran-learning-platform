from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Student(SQLModel, table=True):
    __tablename__ = "students"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    phone: Optional[str] = None
    # Optional; given on the enrollment form when it differs from `phone`.
    whatsapp: Optional[str] = None
    country: Optional[str] = Field(default=None, index=True)
    # Always explicitly assigned from the `students_registration_no_seq` Postgres sequence
    # by `_get_or_create_student()` at creation (see enrollments.py) — required here (no
    # Python-side default) so a caller can never accidentally insert a NULL. Unlike `id`,
    # SQLAlchemy has no special-cased "None means let the DB assign it" behavior for
    # non-primary-key columns, so this can't rely on the column's DB-side default alone.
    registration_no: str = Field(unique=True)
    created_at: datetime = Field(default_factory=utcnow)

    enrollments: list["Enrollment"] = Relationship(back_populates="student")
