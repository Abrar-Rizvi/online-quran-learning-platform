from datetime import datetime, time
from typing import Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from ..models.enrollment import EnrollmentStatus
from .course import CoursePlanRead
from .fields import (
    COUNTRY_MAX,
    NAME_MAX,
    PREFERRED_TIME_MAX,
    check_email,
    check_half_hour,
    check_length,
    check_phone,
    strip,
)
from .student import StudentRead


class EnrollmentCreate(SQLModel):
    name: str
    email: str
    phone: str
    # Optional: only when it differs from `phone`. Blank → None.
    whatsapp: Optional[str] = None
    country: str
    course_plan_id: int
    preferred_time: time

    @field_validator("name", "email", "phone", "country", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return strip(value)

    @field_validator("name")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        return check_length(value, NAME_MAX)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        # Same rule as POST /trial-requests.
        return check_email(value)

    @field_validator("phone")
    @classmethod
    def _valid_phone(cls, value: str) -> str:
        return check_phone(value)

    @field_validator("whatsapp", mode="before")
    @classmethod
    def _blank_whatsapp(cls, value: object) -> object:
        value = strip(value)
        return value or None

    @field_validator("whatsapp")
    @classmethod
    def _valid_whatsapp(cls, value: Optional[str]) -> Optional[str]:
        return None if value is None else check_phone(value)

    @field_validator("country")
    @classmethod
    def _valid_country(cls, value: str) -> str:
        return check_length(value, COUNTRY_MAX)

    @field_validator("preferred_time", mode="before")
    @classmethod
    def _preferred_time_length(cls, value: object) -> object:
        # Parsed as a time of day ("HH:MM" / "HH:MM:SS") as before; this only caps the raw input.
        if isinstance(value, str) and len(value) > PREFERRED_TIME_MAX:
            raise ValueError(f"must be at most {PREFERRED_TIME_MAX} characters")
        return value

    @field_validator("preferred_time")
    @classmethod
    def _half_hour(cls, value: time) -> time:
        # Only new submissions are checked; stored times like 09:44 stay valid.
        return check_half_hour(value)


class EnrollmentRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    status: EnrollmentStatus
    preferred_time: Optional[time] = None
    enrolled_at: datetime
    student: StudentRead
    course_plan: CoursePlanRead


class EnrollmentCreated(EnrollmentRead):
    """Response of POST /enrollments: the enrollment plus its confirmation token.

    The token is the only way to open the public confirmation page, and only
    the submitter receives it.
    """

    confirmation_token: str
