"""Schemas for the admin-only endpoints (dashboard summary + enrollments
+ students)."""

import re
from datetime import datetime, time
from decimal import Decimal
from typing import Optional

from pydantic import field_validator
from sqlmodel import SQLModel

from ..models.enrollment import EnrollmentStatus

_EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


class StudentUpdate(SQLModel):
    """Partial (PATCH) update body for a student.

    Only supplied fields are applied; omitted fields keep their current
    value. Email is normalized (trimmed + lower-cased) and format-checked
    the same way enrollment creation treats student emails.
    """

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().lower()
        if not _EMAIL_RE.fullmatch(normalized):
            raise ValueError("must be a valid email address")
        return normalized


class EnrollmentStatusUpdate(SQLModel):
    """Request body for ``PATCH .../enrollments/{id}/status``."""

    status: EnrollmentStatus


class AdminEnrollmentStudent(SQLModel):
    id: int
    name: str
    email: str


class AdminEnrollmentRead(SQLModel):
    """Admin view of an enrollment: student contact + course plan detail."""

    id: int
    student: AdminEnrollmentStudent
    course_name: str
    days_per_week: int
    fee: Decimal
    currency: str
    status: EnrollmentStatus
    enrolled_at: datetime
    preferred_time: Optional[time] = None


class EnrollmentStatusCounts(SQLModel):
    """Enrollment totals broken down by each valid status."""

    on_trial: int = 0
    active: int = 0
    cancelled: int = 0
    alumni: int = 0


class AdminSummary(SQLModel):
    """Response for ``GET /admin/summary``."""

    total_students: int
    total_enrollments: int
    by_status: EnrollmentStatusCounts


class ConversationRead(SQLModel):
    """Admin view of a chat conversation with its message count."""

    id: int
    started_at: datetime
    last_message_at: datetime
    message_count: int


class MessageRead(SQLModel):
    """Admin view of a single chat message."""

    id: int
    role: str
    content: str
    tool_called: Optional[str] = None
    registration_link_given: bool = False
    routed_to_whatsapp: bool = False
    created_at: datetime


class CourseEnrollmentCount(SQLModel):
    """One row of the ``GET /admin/analytics/course-enrollments`` output."""

    course_id: int
    course_name: str
    enrollment_count: int
