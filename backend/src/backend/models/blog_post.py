from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import CheckConstraint, Column, Index, Text
from sqlmodel import Field, SQLModel, UniqueConstraint

from .student import utcnow


class BlogPostStatus(str, Enum):
    """The only valid values for ``blog_posts.status``.

    Mirrors the DB-level CHECK constraint ``ck_blog_posts_status``.
    """

    DRAFT = "draft"
    PUBLISHED = "published"


# Every new post starts as a draft unless the admin publishes it explicitly.
DEFAULT_BLOG_POST_STATUS = BlogPostStatus.DRAFT

VALID_BLOG_POST_STATUSES = frozenset(s.value for s in BlogPostStatus)

TITLE_MAX_LENGTH = 200
SLUG_MAX_LENGTH = 200
EXCERPT_MAX_LENGTH = 300


class BlogPost(SQLModel, table=True):
    """A blog article.

    ``content`` is stored as-is (Markdown). It is NOT sanitized here: any
    frontend must render it as Markdown with raw HTML disabled.
    """

    __tablename__ = "blog_posts"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_blog_posts_slug"),
        CheckConstraint(
            "status IN ('draft','published')", name="ck_blog_posts_status"
        ),
        # Public listing: published posts ordered by published_at.
        Index("ix_blog_posts_status_published_at", "status", "published_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=TITLE_MAX_LENGTH)
    slug: str = Field(max_length=SLUG_MAX_LENGTH)
    excerpt: str = Field(max_length=EXCERPT_MAX_LENGTH)
    content: str = Field(sa_column=Column(Text, nullable=False))
    cover_image_url: Optional[str] = Field(default=None)
    status: str = Field(default=DEFAULT_BLOG_POST_STATUS.value)
    # Set the first time the post is published; kept if it is later unpublished.
    published_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(
        default_factory=utcnow, sa_column_kwargs={"onupdate": utcnow}
    )
