from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel


class CourseRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    description: Optional[str] = None
    category: Optional[str] = None


class CoursePlanRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    days_per_week: int
    fee: Decimal
    currency: str


class CourseDetail(CourseRead):
    course_plans: list[CoursePlanRead] = []
