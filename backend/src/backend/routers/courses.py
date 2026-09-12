from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..course_search import LIST_COLUMNS, find_similar_courses
from ..db import get_session
from ..models import Course, CoursePlan
from ..schemas import CourseDetail, CourseRead

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseRead])
def list_courses(session: Session = Depends(get_session)) -> list[CourseRead]:
    rows = session.exec(select(*LIST_COLUMNS).order_by(Course.id)).all()
    return [CourseRead(id=r[0], name=r[1], description=r[2], category=r[3]) for r in rows]


@router.get("/search", response_model=list[CourseRead])
def search_courses(
    q: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    session: Session = Depends(get_session),
) -> list[CourseRead]:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=422, detail="q must not be blank")

    return find_similar_courses(session, query, limit=limit)


@router.get("/{course_id}", response_model=CourseDetail)
def get_course(course_id: int, session: Session = Depends(get_session)) -> CourseDetail:
    row = session.exec(
        select(*LIST_COLUMNS).where(Course.id == course_id)
    ).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Course not found")

    plans = session.exec(
        select(CoursePlan).where(CoursePlan.course_id == course_id)
    ).all()

    return CourseDetail(
        id=row[0],
        name=row[1],
        description=row[2],
        category=row[3],
        course_plans=list(plans),
    )
