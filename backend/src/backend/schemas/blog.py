"""Schemas for the blog: public read shapes + admin create/update/read."""

import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from ..models.blog_post import (
    DEFAULT_BLOG_POST_STATUS,
    EXCERPT_MAX_LENGTH,
    SLUG_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    BlogPostStatus,
)

# Lowercase letters and digits, separated by single hyphens (no leading/trailing hyphen).
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

COVER_IMAGE_URL_MAX_LENGTH = 2048


def _strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


def _check_slug(value: str) -> str:
    if not SLUG_RE.fullmatch(value):
        raise ValueError(
            "must contain only lowercase letters, digits and single hyphens"
        )
    return value


def _check_content(value: Optional[str]) -> Optional[str]:
    # Stored as-is (Markdown, not trimmed) — only a blank body is rejected.
    if value is not None and not value.strip():
        raise ValueError("must not be blank")
    return value


def _check_cover_image_url(value: Optional[str]) -> Optional[str]:
    # A blank value clears the cover image.
    if not value:
        return None
    if len(value) > COVER_IMAGE_URL_MAX_LENGTH:
        raise ValueError(
            f"must be at most {COVER_IMAGE_URL_MAX_LENGTH} characters"
        )
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or " " in value:
        raise ValueError("must be an http(s) URL")
    return value


class BlogPostCreate(SQLModel):
    """Request body for ``POST /admin/blog``.

    ``slug`` is optional: omitted or blank means "generate one from the title".
    """

    title: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    excerpt: str = Field(min_length=1, max_length=EXCERPT_MAX_LENGTH)
    content: str
    slug: Optional[str] = Field(default=None, max_length=SLUG_MAX_LENGTH)
    cover_image_url: Optional[str] = None
    status: BlogPostStatus = DEFAULT_BLOG_POST_STATUS

    _strip_inputs = field_validator(
        "title", "excerpt", "slug", "cover_image_url", mode="before"
    )(_strip)
    _valid_content = field_validator("content")(_check_content)
    _valid_cover_image_url = field_validator("cover_image_url")(
        _check_cover_image_url
    )

    @field_validator("slug")
    @classmethod
    def _valid_slug(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        return _check_slug(value)


class BlogPostUpdate(SQLModel):
    """Partial (PATCH) body for ``PATCH /admin/blog/{id}``.

    Only supplied fields are applied. Changing ``title`` never changes the
    slug. A null ``cover_image_url`` clears it; an explicit null for any other
    field is rejected by the router.
    """

    title: Optional[str] = Field(default=None, min_length=1, max_length=TITLE_MAX_LENGTH)
    slug: Optional[str] = Field(default=None, max_length=SLUG_MAX_LENGTH)
    excerpt: Optional[str] = Field(
        default=None, min_length=1, max_length=EXCERPT_MAX_LENGTH
    )
    content: Optional[str] = None
    cover_image_url: Optional[str] = None
    status: Optional[BlogPostStatus] = None

    _strip_inputs = field_validator(
        "title", "excerpt", "slug", "cover_image_url", mode="before"
    )(_strip)
    _valid_content = field_validator("content")(_check_content)
    _valid_cover_image_url = field_validator("cover_image_url")(
        _check_cover_image_url
    )

    @field_validator("slug")
    @classmethod
    def _valid_slug(cls, value: Optional[str]) -> Optional[str]:
        # Unlike create, a blank slug here is invalid (never auto-generated).
        if value is None:
            return value
        return _check_slug(value)


class BlogPostSummary(SQLModel):
    """One card in the public ``GET /blog`` listing (no content)."""

    model_config = {"from_attributes": True}

    id: int
    title: str
    slug: str
    excerpt: str
    cover_image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    updated_at: datetime


class BlogPostPublic(BlogPostSummary):
    """Response for ``GET /blog/{slug}``. ``content`` is raw Markdown."""

    content: str


class BlogPostPage(SQLModel):
    """Paginated response for ``GET /blog``."""

    items: list[BlogPostSummary]
    total: int
    limit: int
    offset: int


class AdminBlogPostSummary(SQLModel):
    """One row of ``GET /admin/blog`` (no content)."""

    model_config = {"from_attributes": True}

    id: int
    title: str
    slug: str
    excerpt: str
    status: BlogPostStatus
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AdminBlogPostRead(AdminBlogPostSummary):
    """Full admin view of a post, including drafts."""

    content: str
    cover_image_url: Optional[str] = None
