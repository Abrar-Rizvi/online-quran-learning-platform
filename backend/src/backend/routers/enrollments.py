from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from ..db import get_session
from ..models import CoursePlan, Enrollment, Student
from ..schemas import EnrollmentCreate, EnrollmentRead

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _get_or_create_student(
    session: Session, payload: EnrollmentCreate
) -> Student:
    email = _normalize_email(payload.email)
    student = session.exec(select(Student).where(Student.email == email)).first()
    if student is not None:
        return student

    student = Student(
        name=payload.name.strip(),
        email=email,
        phone=payload.phone.strip() if payload.phone else None,
        country=payload.country.strip() if payload.country else None,
    )
    session.add(student)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        student = session.exec(select(Student).where(Student.email == email)).first()
        if student is None:
            raise
    return student


@router.post("", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    session: Session = Depends(get_session),
) -> Enrollment:
    student = _get_or_create_student(session, payload)

    plan = session.get(CoursePlan, payload.course_plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Course plan not found")

    existing = session.exec(
        select(Enrollment).where(
            Enrollment.student_id == student.id,
            Enrollment.course_plan_id == payload.course_plan_id,
        )
    ).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this course plan",
        )

    enrollment = Enrollment(
        student_id=student.id,
        course_plan_id=payload.course_plan_id,
        preferred_time=payload.preferred_time,
    )
    session.add(enrollment)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this course plan",
        )
    session.refresh(enrollment)

    return _load_enrollment(session, enrollment.id)


@router.get("/{enrollment_id}", response_model=EnrollmentRead)
def get_enrollment(
    enrollment_id: int, session: Session = Depends(get_session)
) -> Enrollment:
    enrollment = _load_enrollment(session, enrollment_id)
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enrollment


def _load_enrollment(session: Session, enrollment_id: int) -> Enrollment | None:
    return session.exec(
        select(Enrollment)
        .options(selectinload(Enrollment.student), selectinload(Enrollment.course_plan))
        .where(Enrollment.id == enrollment_id)
    ).first()
