from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, Column, Index, Text
from sqlmodel import Field, Relationship, SQLModel

from ..course_slugs import COURSE_SLUG_MAX_LENGTH, COURSE_SLUG_PATTERN
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
        CheckConstraint(f"slug ~ '{COURSE_SLUG_PATTERN}'", name="ck_courses_slug_format"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    slug: str = Field(max_length=COURSE_SLUG_MAX_LENGTH, index=True, unique=True)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, index=True)
    meta_title: Optional[str] = Field(default=None, max_length=255)
    meta_description: Optional[str] = Field(default=None, max_length=500)
    seo_content: Optional[str] = Field(default=None, sa_type=Text)
    embedding: Any = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    course_plans: list["CoursePlan"] = Relationship(back_populates="course")
    enrollments: list["Enrollment"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"secondary": "course_plans", "viewonly": True},
    )
