import secrets
from datetime import datetime, time
from enum import Enum
from typing import Optional

from sqlalchemy import CheckConstraint
from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint

from .student import utcnow


class EnrollmentStatus(str, Enum):
    """The only valid values for ``enrollments.status``.

    Mirrors the DB-level CHECK constraint ``ck_enrollments_status`` so the
    API layer validates the same four values as the database.
    """

    ON_TRIAL = "on_trial"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    ALUMNI = "alumni"


# Every new enrollment starts as a free-trial enrollment.
DEFAULT_ENROLLMENT_STATUS = EnrollmentStatus.ON_TRIAL

VALID_ENROLLMENT_STATUSES = frozenset(s.value for s in EnrollmentStatus)

# Allowed status transitions (enforced at the API level in a later phase).
# Lifecycle: a student starts on_trial, either continues to active or is
# cancelled, and an active student either graduates (alumni) or is
# cancelled. No other transitions are valid.
STATUS_TRANSITIONS: dict[EnrollmentStatus, set[EnrollmentStatus]] = {
    EnrollmentStatus.ON_TRIAL: {EnrollmentStatus.ACTIVE, EnrollmentStatus.CANCELLED},
    EnrollmentStatus.ACTIVE: {EnrollmentStatus.ALUMNI, EnrollmentStatus.CANCELLED},
    EnrollmentStatus.CANCELLED: set(),
    EnrollmentStatus.ALUMNI: set(),
}


def can_transition(current: EnrollmentStatus, target: EnrollmentStatus) -> bool:
    """Return whether moving from ``current`` to ``target`` is allowed."""
    return target in STATUS_TRANSITIONS.get(current, set())


def new_confirmation_token() -> str:
    """43 URL-safe characters (32 random bytes) from the standard library."""
    return secrets.token_urlsafe(32)


class Enrollment(SQLModel, table=True):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "course_plan_id",
            name="uq_enrollments_student_course_plan",
        ),
        UniqueConstraint("confirmation_token", name="uq_enrollments_confirmation_token"),
        # Same expression as migration e3d6a0f2c9a1 (declared so autogenerate keeps it).
        CheckConstraint(
            "status IN ('on_trial','active','cancelled','alumni')",
            name="ck_enrollments_status",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="students.id", index=True)
    course_plan_id: int = Field(foreign_key="course_plans.id", index=True)
    status: str = Field(default=DEFAULT_ENROLLMENT_STATUS.value, index=True)
    preferred_time: Optional[time] = Field(default=None)
    enrolled_at: datetime = Field(default_factory=utcnow)
    # Unguessable id for the public confirmation page; only the submitter receives it.
    confirmation_token: str = Field(default_factory=new_confirmation_token)

    student: "Student" = Relationship(back_populates="enrollments")
    course_plan: "CoursePlan" = Relationship(back_populates="enrollments")
    course: "Course" = Relationship(
        back_populates="enrollments",
        sa_relationship_kwargs={"secondary": "course_plans", "viewonly": True},
    )
