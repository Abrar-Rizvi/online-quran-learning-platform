from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index
from sqlmodel import Field, Relationship, SQLModel

from ..embeddings import EMBEDDING_DIM


class Course(SQLModel, table=True):
    __tablename__ = "courses"
    __table_args__ = (
        # Created in the initial migration with raw SQL; declared here so autogenerate
        # doesn't try to drop it: CREATE INDEX ... USING hnsw (embedding vector_cosine_ops).
        Index(
            "ix_courses_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

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
