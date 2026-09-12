from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column
from sqlmodel import Field, Relationship, SQLModel

from ..embeddings import EMBEDDING_DIM


class Course(SQLModel, table=True):
    __tablename__ = "courses"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, index=True)
    embedding: Any = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    course_plans: list["CoursePlan"] = Relationship(back_populates="course")
    enrollments: list["Enrollment"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"secondary": "course_plans", "viewonly": True},
    )
