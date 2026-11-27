from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_
from sqlmodel import Session, select

from ..auth import AdminPrincipal, require_roles
from ..course_updates import update_course
from ..db import get_session
from ..embeddings import EmbeddingUnavailable
from ..models import Course
from ..schemas.admin_course import AdminCourseDetail, AdminCourseListItem, AdminCoursePatch

_course_editor = require_roles("owner", "seo_editor")
router = APIRouter(
    prefix="/admin/courses",
    tags=["admin"],
    dependencies=[Depends(_course_editor)],
)

_SUMMARY_COLUMNS = (
    Course.id, Course.name, Course.slug, Course.category, Course.image_path,
    Course.meta_title, Course.meta_description,
)


@router.get("", response_model=list[AdminCourseListItem])
def list_courses(session: Session = Depends(get_session)) -> list[AdminCourseListItem]:
    has_seo_content = and_(Course.seo_content.is_not(None), Course.seo_content != "")
    rows = session.exec(
        select(*_SUMMARY_COLUMNS, has_seo_content.label("has_seo_content")).order_by(Course.id)
    ).all()
    return [AdminCourseListItem.model_validate(row._mapping) for row in rows]


@router.get("/{course_id}", response_model=AdminCourseDetail)
def get_course(course_id: int, session: Session = Depends(get_session)) -> AdminCourseDetail:
    row = session.exec(
        select(*_SUMMARY_COLUMNS, Course.description, Course.seo_content)
        .where(Course.id == course_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return AdminCourseDetail.model_validate(row._mapping)


@router.patch("/{course_id}", response_model=AdminCourseDetail)
def patch_course(
    course_id: int,
    payload: AdminCoursePatch,
    request: Request,
    principal: AdminPrincipal = Depends(_course_editor),
    session: Session = Depends(get_session),
) -> AdminCourseDetail:
    try:
        course = update_course(
            session, course_id, actor=principal, request=request,
            **payload.model_dump(exclude_unset=True),
        )
    except EmbeddingUnavailable as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not regenerate the course embedding. Please try again.",
        ) from exc

    response = AdminCourseDetail.model_validate(course)
    session.commit()
    return response
