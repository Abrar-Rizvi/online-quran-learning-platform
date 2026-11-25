from pydantic import ConfigDict, field_validator
from sqlmodel import Field, SQLModel

from ..course_slugs import COURSE_SLUG_MAX_LENGTH, validate_course_slug


class _AdminCourseRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    category: str | None
    meta_title: str | None
    meta_description: str | None


class AdminCourseListItem(_AdminCourseRead):
    has_seo_content: bool


class AdminCourseDetail(_AdminCourseRead):
    description: str | None
    seo_content: str | None


class AdminCoursePatch(SQLModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    slug: str | None = Field(default=None, max_length=COURSE_SLUG_MAX_LENGTH)
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=500)
    seo_content: str | None = Field(default=None, max_length=100_000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Course name must not be blank.")
        return value.strip()

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Course slug cannot be null.")
        return validate_course_slug(value)
