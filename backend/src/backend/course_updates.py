"""Transactional course edits shared by the admin API and maintenance scripts."""

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from .audit import write_audit
from .auth import AdminPrincipal
from .course_slugs import validate_course_slug
from .embeddings import EmbeddingUnavailable, embed_one
from .models import Course
from .redirects import add_redirect, audit_redirect_addition


class _Unset:
    pass


_UNSET = _Unset()


def update_course(
    session: Session,
    course_id: int,
    *,
    name: str | None = None,
    description: str | None | _Unset = _UNSET,
    slug: str | None = None,
    meta_title: str | None | _Unset = _UNSET,
    meta_description: str | None | _Unset = _UNSET,
    seo_content: str | None | _Unset = _UNSET,
    actor: AdminPrincipal,
    request: Request | None = None,
) -> Course:
    """Apply supplied values and return the course. The caller commits.

    A savepoint keeps course, redirect and audit changes atomic even when
    the caller catches an error and continues using the surrounding transaction.
    """
    if slug is not None:
        validate_course_slug(slug)

    supplied = {
        "name": name if name is not None else _UNSET,
        "description": description,
        "slug": slug if slug is not None else _UNSET,
        "meta_title": None if meta_title == "" else meta_title,
        "meta_description": None if meta_description == "" else meta_description,
        "seo_content": None if seo_content == "" else seo_content,
    }

    try:
        with session.begin_nested():
            course = session.get(Course, course_id, with_for_update=True, populate_existing=True)
            if course is None:
                raise HTTPException(status_code=404, detail="Course not found")

            changes = {
                field: value for field, value in supplied.items()
                if value is not _UNSET and value != getattr(course, field)
            }
            # Audit every successful API PATCH, including a no-op.
            if not changes and request is None:
                return course
            before = {field: getattr(course, field) for field in changes}

            if "slug" in changes and session.exec(
                select(Course.id).where(Course.slug == slug, Course.id != course_id)
            ).first() is not None:
                raise HTTPException(status_code=409, detail="A course with this slug already exists")

            course.sqlmodel_update(changes)
            if "name" in changes or "description" in changes:
                try:
                    course.embedding = embed_one(course.description or course.name)
                except Exception as exc:
                    raise EmbeddingUnavailable("Could not regenerate the course embedding") from exc
            session.flush()

            if "slug" in changes:
                destination = f"/courses/{course.slug}"
                result = add_redirect(
                    session, f"/courses/{before['slug']}", destination, actor.name,
                )
                if result.redirect.to_path != destination:
                    raise HTTPException(status_code=409, detail="The destination course URL already redirects")
                audit_redirect_addition(session, actor, result)

            write_audit(
                session, actor, "course.update", "course", str(course_id),
                before, changes, request,
            )
        return course
    except IntegrityError as exc:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        if constraint == "ix_courses_slug":
            raise HTTPException(status_code=409, detail="A course with this slug already exists") from exc
        if constraint == "ix_courses_name":
            raise HTTPException(status_code=409, detail="A course with this name already exists") from exc
        raise
