import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, text

from ..db import get_session
from ..models import CoursePlan, Enrollment, Student
from ..rate_limit import SlidingWindowRateLimiter, rate_limit
from ..schemas import EnrollmentCreate, EnrollmentCreated, EnrollmentRead

router = APIRouter(prefix="/enrollments", tags=["enrollments"])

# Families may enroll several children: 10 submissions per client IP per hour.
# The admin panel's "Enroll this student" sends the admin token and isn't counted.
enrollment_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60 * 60)

# secrets.token_urlsafe(32) → exactly 43 characters from this alphabet.
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _next_registration_no(session: Session) -> str:
    """Atomically reserve the next "AOA-" reference number.

    ``nextval()`` on a Postgres sequence is concurrency-safe on its own (each
    concurrent caller gets a distinct value even without holding a row lock)
    and, unlike the column's DB-side default, actually takes effect: SQLAlchemy
    has no special "None means let the DB assign it" handling for non-primary-key
    columns, so the value must be generated here and passed in explicitly.
    """
    value = session.execute(text("SELECT nextval('students_registration_no_seq')")).scalar_one()
    return f"AOA-{value}"


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
        # Only for a new student; an existing student (same email) keeps their details.
        whatsapp=payload.whatsapp,
        country=payload.country.strip() if payload.country else None,
        registration_no=_next_registration_no(session),
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


@router.post(
    "",
    response_model=EnrollmentCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(enrollment_limiter, "Too many submissions. Please try again later.", exempt_admin=True))],
)
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


@router.get("/confirmation/{token}", response_model=EnrollmentRead)
def get_enrollment_by_confirmation_token(
    token: str, session: Session = Depends(get_session)
) -> Enrollment:
    """Public confirmation page data, looked up by the unguessable token only.

    Anything that isn't token-shaped is a 404 without touching the database.
    There is deliberately no lookup by numeric id (ids are sequential).
    """
    if not _TOKEN_RE.fullmatch(token):
        raise HTTPException(status_code=404, detail="Enrollment not found")
    enrollment = session.exec(
        select(Enrollment)
        .options(selectinload(Enrollment.student), selectinload(Enrollment.course_plan))
        .where(Enrollment.confirmation_token == token)
    ).first()
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return enrollment


def _load_enrollment(session: Session, enrollment_id: int) -> Enrollment | None:
    return session.exec(
        select(Enrollment)
        .options(selectinload(Enrollment.student), selectinload(Enrollment.course_plan))
        .where(Enrollment.id == enrollment_id)
    ).first()
