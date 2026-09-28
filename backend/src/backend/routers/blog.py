"""Blog: public read endpoints (published posts only) + admin CRUD.

``content`` is stored exactly as the admin wrote it (Markdown) and is NOT
sanitized server-side. Any frontend must render it as Markdown with raw HTML
disabled, otherwise a post could inject HTML/script into the site.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ..auth import get_current_admin
from ..db import get_session
from ..models import BlogPost, BlogPostStatus
from ..models.blog_post import SLUG_MAX_LENGTH
from ..models.student import utcnow
from ..schemas.blog import (
    AdminBlogPostRead,
    AdminBlogPostSummary,
    BlogPostCreate,
    BlogPostPage,
    BlogPostPublic,
    BlogPostSummary,
    BlogPostUpdate,
)

router = APIRouter(prefix="/blog", tags=["blog"])
admin_router = APIRouter(prefix="/admin/blog", tags=["admin"])

_NOT_FOUND = "Blog post not found"


def _slugify(title: str) -> str:
    """"Hello, World!" -> "hello-world". Falls back to "post" when nothing usable remains
    (e.g. a title written entirely in Arabic/Urdu script)."""
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:SLUG_MAX_LENGTH].rstrip("-") or "post"


def _slug_taken(
    session: Session, slug: str, exclude_id: Optional[int] = None
) -> bool:
    query = select(BlogPost.id).where(BlogPost.slug == slug)
    if exclude_id is not None:
        query = query.where(BlogPost.id != exclude_id)
    return session.exec(query).first() is not None


def _unique_slug_from_title(session: Session, title: str) -> str:
    """Generated slugs get -2, -3, ... appended until unique."""
    base = _slugify(title)
    candidate = base
    n = 2
    while _slug_taken(session, candidate):
        suffix = f"-{n}"
        candidate = base[: SLUG_MAX_LENGTH - len(suffix)].rstrip("-") + suffix
        n += 1
    return candidate


def _slug_conflict(slug: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"A blog post with slug '{slug}' already exists.",
    )


def _stamp_first_publish(post: BlogPost) -> None:
    # published_at records the FIRST publish only; unpublish/republish keep it.
    if post.status == BlogPostStatus.PUBLISHED.value and post.published_at is None:
        post.published_at = utcnow()


def _commit_post(session: Session, post: BlogPost) -> BlogPost:
    session.add(post)
    try:
        session.commit()
    except IntegrityError:
        # Only the slug is unique — a concurrent create/update took it first.
        session.rollback()
        raise _slug_conflict(post.slug)
    session.refresh(post)
    return post


def _get_post_or_404(session: Session, post_id: int) -> BlogPost:
    post = session.get(BlogPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    return post


# ── Public ────────────────────────────────────────────────────────────────


@router.get("", response_model=BlogPostPage)
def list_published_posts(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> BlogPostPage:
    published = BlogPost.status == BlogPostStatus.PUBLISHED.value
    total = session.exec(
        select(func.count()).select_from(BlogPost).where(published)
    ).one()
    rows = session.exec(
        select(BlogPost)
        .where(published)
        .order_by(BlogPost.published_at.desc(), BlogPost.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return BlogPostPage(
        items=[BlogPostSummary.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{slug}", response_model=BlogPostPublic)
def get_published_post(
    slug: str, session: Session = Depends(get_session)
) -> BlogPost:
    # Drafts are indistinguishable from missing posts on the public API.
    post = session.exec(
        select(BlogPost).where(
            BlogPost.slug == slug,
            BlogPost.status == BlogPostStatus.PUBLISHED.value,
        )
    ).first()
    if post is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND)
    return post


# ── Admin ─────────────────────────────────────────────────────────────────


@admin_router.get("", response_model=list[AdminBlogPostSummary])
def admin_list_posts(
    status_filter: Optional[BlogPostStatus] = Query(default=None, alias="status"),
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[BlogPost]:
    query = select(BlogPost).order_by(BlogPost.updated_at.desc(), BlogPost.id.desc())
    if status_filter is not None:
        query = query.where(BlogPost.status == status_filter.value)
    return session.exec(query).all()


@admin_router.get("/{post_id}", response_model=AdminBlogPostRead)
def admin_get_post(
    post_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> BlogPost:
    return _get_post_or_404(session, post_id)


@admin_router.post(
    "", response_model=AdminBlogPostRead, status_code=status.HTTP_201_CREATED
)
def admin_create_post(
    payload: BlogPostCreate,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> BlogPost:
    if payload.slug is None:
        slug = _unique_slug_from_title(session, payload.title)
    else:
        # An explicitly chosen slug is never auto-suffixed.
        slug = payload.slug
        if _slug_taken(session, slug):
            raise _slug_conflict(slug)

    post = BlogPost(
        title=payload.title,
        slug=slug,
        excerpt=payload.excerpt,
        content=payload.content,
        cover_image_url=payload.cover_image_url,
        status=payload.status.value,
    )
    _stamp_first_publish(post)
    return _commit_post(session, post)


@admin_router.patch("/{post_id}", response_model=AdminBlogPostRead)
def admin_update_post(
    post_id: int,
    payload: BlogPostUpdate,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> BlogPost:
    post = _get_post_or_404(session, post_id)
    updates = payload.model_dump(exclude_unset=True)

    # Only cover_image_url may be cleared with null; the rest are NOT NULL columns.
    for key in ("title", "slug", "excerpt", "content", "status"):
        if key in updates and updates[key] is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")

    if "slug" in updates and _slug_taken(session, updates["slug"], exclude_id=post.id):
        raise _slug_conflict(updates["slug"])

    if "status" in updates:
        updates["status"] = updates["status"].value

    post.sqlmodel_update(updates)
    _stamp_first_publish(post)
    return _commit_post(session, post)


@admin_router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_post(
    post_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    post = _get_post_or_404(session, post_id)
    session.delete(post)
    session.commit()
