from decimal import Decimal
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


class CoursePlan(SQLModel, table=True):
    __tablename__ = "course_plans"
    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "days_per_week",
            name="uq_course_plans_course_days",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="courses.id", index=True)
    days_per_week: int = Field(ge=1, le=7)
    fee: Decimal = Field(max_digits=10, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)

    course: "Course" = Relationship(back_populates="course_plans")
    enrollments: list["Enrollment"] = Relationship(back_populates="course_plan")
