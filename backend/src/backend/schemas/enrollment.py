from datetime import datetime, time
from typing import Optional

from sqlmodel import Field, SQLModel

from ..models.enrollment import EnrollmentStatus
from .course import CoursePlanRead
from .student import StudentRead


class EnrollmentCreate(SQLModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    phone: Optional[str] = None
    country: Optional[str] = None
    course_plan_id: int
    preferred_time: Optional[time] = None


class EnrollmentRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    status: EnrollmentStatus
    preferred_time: Optional[time] = None
    enrolled_at: datetime
    student: StudentRead
    course_plan: CoursePlanRead
