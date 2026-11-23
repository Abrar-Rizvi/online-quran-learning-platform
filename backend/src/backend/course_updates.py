"""Transactional course edits shared by maintenance scripts and future callers."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from .audit import snapshot, write_audit
from .auth import AdminPrincipal
from .course_slugs import validate_course_slug
from .embeddings import EmbeddingUnavailable, embed_one
from .models import Course
from .redirects import add_redirect, audit_redirect_addition


def _course_snapshot(course: Course) -> dict:
    fields = snapshot(course)
    fields.pop("embedding", None)
    return fields


def update_course(
    session: Session,
    course_id: int,
    *,
    name: str | None = None,
    description: str | None = None,
    slug: str | None = None,
    actor: AdminPrincipal,
) -> Course:
    """Apply supplied values and return the course. The caller commits.

    A savepoint keeps course, redirect and audit changes atomic even when
    the caller catches an error and continues using the surrounding transaction.
    """
    if slug is not None:
        validate_course_slug(slug)

    try:
        with session.begin_nested():
            course = session.get(Course, course_id, with_for_update=True, populate_existing=True)
            if course is None:
                raise HTTPException(status_code=404, detail="Course not found")

            before = _course_snapshot(course)
            next_name = course.name if name is None else name
            next_description = course.description if description is None else description
            next_slug = course.slug if slug is None else slug
            text_changed = next_name != course.name or next_description != course.description
            slug_changed = next_slug != course.slug
            if not text_changed and not slug_changed:
                return course

            if slug_changed and session.exec(
                select(Course.id).where(Course.slug == next_slug, Course.id != course_id)
            ).first() is not None:
                raise HTTPException(status_code=409, detail="A course with this slug already exists")

            if text_changed:
                try:
                    course.embedding = embed_one(next_description or next_name)
                except Exception as exc:
                    raise EmbeddingUnavailable("Could not regenerate the course embedding") from exc
            course.name = next_name
            course.description = next_description
            course.slug = next_slug
            session.flush()

            if slug_changed:
                destination = f"/courses/{next_slug}"
                result = add_redirect(
                    session, f"/courses/{before['slug']}", destination, actor.name,
                )
                if result.redirect.to_path != destination:
                    raise HTTPException(status_code=409, detail="The destination course URL already redirects")
                audit_redirect_addition(session, actor, result)

            write_audit(
                session, actor, "course.update", "course", str(course_id),
                before, _course_snapshot(course),
            )
        return course
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "ix_courses_slug":
            raise HTTPException(status_code=409, detail="A course with this slug already exists") from exc
        if constraint == "ix_courses_name":
            raise HTTPException(status_code=409, detail="A course with this name already exists") from exc
        raise
