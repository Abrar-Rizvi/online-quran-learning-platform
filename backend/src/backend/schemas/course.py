from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel


class CourseRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    slug: str
    description: Optional[str] = None
    category: Optional[str] = None


class CoursePlanRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    days_per_week: int
    fee: Decimal
    currency: str


class FeePlanRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    course_id: int
    days_per_week: int
    fee: Decimal
    currency: str


class CourseDetail(CourseRead):
    course_plans: list[CoursePlanRead] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    seo_content: Optional[str] = None
