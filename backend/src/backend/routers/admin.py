"""Admin-only endpoints: dashboard summary + enrollment management.

Every route in this module requires a valid admin JWT, enforced via the
``get_current_admin`` dependency (``backend.auth``).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from ..auth import get_current_admin
from ..db import get_session
from ..models import Conversation, Course, CoursePlan, Enrollment, Message, Student
from ..models.enrollment import EnrollmentStatus, STATUS_TRANSITIONS, can_transition
from ..schemas.admin import (
    AdminEnrollmentRead,
    AdminEnrollmentStudent,
    AdminSummary,
    ConversationRead,
    CourseEnrollmentCount,
    EnrollmentStatusCounts,
    EnrollmentStatusUpdate,
    MessageRead,
    StudentUpdate,
)
from ..schemas.student import StudentRead

router = APIRouter(prefix="/admin", tags=["admin"])

_ENROLLMENT_LOADS = (
    selectinload(Enrollment.student),
    selectinload(Enrollment.course_plan).selectinload(CoursePlan.course),
)


def _load_enrollment(session: Session, enrollment_id: int) -> Enrollment | None:
    """Fetch one enrollment with student + plan + course eagerly loaded."""
    return session.exec(
        select(Enrollment)
        .options(*_ENROLLMENT_LOADS)
        .where(Enrollment.id == enrollment_id)
    ).first()


def _as_admin_read(enrollment: Enrollment) -> AdminEnrollmentRead:
    plan = enrollment.course_plan
    return AdminEnrollmentRead(
        id=enrollment.id,
        student=AdminEnrollmentStudent(
            name=enrollment.student.name,
            email=enrollment.student.email,
            id=enrollment.student.id,
        ),
        course_name=plan.course.name,
        days_per_week=plan.days_per_week,
        fee=plan.fee,
        currency=plan.currency,
        status=EnrollmentStatus(enrollment.status),
        enrolled_at=enrollment.enrolled_at,
        preferred_time=enrollment.preferred_time,
    )


@router.get("/summary", response_model=AdminSummary)
def summary(
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> AdminSummary:
    total_students = session.exec(
        select(func.count()).select_from(Student)
    ).one()
    total_enrollments = session.exec(
        select(func.count()).select_from(Enrollment)
    ).one()

    counts = EnrollmentStatusCounts()
    rows = session.exec(
        select(Enrollment.status, func.count()).group_by(Enrollment.status)
    ).all()
    for status_value, count in rows:
        if hasattr(counts, status_value):
            setattr(counts, status_value, count)

    return AdminSummary(
        total_students=total_students,
        total_enrollments=total_enrollments,
        by_status=counts,
    )


@router.get("/enrollments", response_model=list[AdminEnrollmentRead])
def list_enrollments(
    status_filter: Optional[EnrollmentStatus] = Query(
        default=None, alias="status"
    ),
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[AdminEnrollmentRead]:
    query = select(Enrollment).options(*_ENROLLMENT_LOADS).order_by(Enrollment.id)
    if status_filter is not None:
        query = query.where(Enrollment.status == status_filter.value)

    rows = session.exec(query).all()
    return [_as_admin_read(row) for row in rows]


@router.patch(
    "/enrollments/{enrollment_id}/status", response_model=AdminEnrollmentRead
)
def update_enrollment_status(
    enrollment_id: int,
    payload: EnrollmentStatusUpdate,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> AdminEnrollmentRead:
    enrollment = _load_enrollment(session, enrollment_id)
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    current = EnrollmentStatus(enrollment.status)
    target = payload.status

    if not can_transition(current, target):
        allowed = STATUS_TRANSITIONS.get(current, set())
        if allowed:
            why = (
                "an enrollment in this status may only move to: "
                + ", ".join(sorted(s.value for s in allowed))
            )
        else:
            why = f"'{current.value}' is a terminal status and cannot be changed"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot change enrollment {enrollment_id} status from "
                f"'{current.value}' to '{target.value}': {why}."
            ),
        )

    enrollment.status = target.value
    session.add(enrollment)
    session.commit()

    updated = _load_enrollment(session, enrollment_id)
    return _as_admin_read(updated)


@router.delete(
    "/enrollments/{enrollment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_enrollment(
    enrollment_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    enrollment = session.get(Enrollment, enrollment_id)
    if enrollment is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    session.delete(enrollment)
    session.commit()


@router.get("/students", response_model=list[StudentRead])
def list_students(
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[Student]:
    return session.exec(select(Student).order_by(Student.id)).all()


@router.patch("/students/{student_id}", response_model=StudentRead)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> Student:
    student = session.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    updates = payload.model_dump(exclude_unset=True)

    # name / email are NOT NULL columns — an explicit null must not reach the DB.
    for key in ("name", "email"):
        if key in updates and updates[key] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{key} cannot be null",
            )

    if "name" in updates:
        name = updates["name"].strip()
        if not name:
            raise HTTPException(
                status_code=422,
                detail="name must not be blank",
            )
        updates["name"] = name

    # Same rule as enrollment creation: emails are trimmed + lower-cased and
    # must be unique across students.
    if "email" in updates:
        candidate = updates["email"]
        existing = session.exec(
            select(Student).where(Student.email == candidate)
        ).first()
        if existing is not None and existing.id != student.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A student with email '{candidate}' already exists "
                    f"(student id {existing.id})"
                ),
            )
        updates["email"] = candidate

    # Optional contact fields: trim whitespace; blank clears to NULL.
    for key in ("phone", "country"):
        if key in updates and updates[key] is not None:
            updates[key] = updates[key].strip() or None

    student.sqlmodel_update(updates)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot update student: the email already belongs to another "
                "student"
            ),
        )
    session.refresh(student)
    return student


@router.delete(
    "/students/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_student(
    student_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    student = session.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    enrollment_count = session.exec(
        select(func.count())
        .select_from(Enrollment)
        .where(Enrollment.student_id == student_id)
    ).one()
    if enrollment_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Student {student_id} has {enrollment_count} enrollment(s) "
                "and cannot be deleted. Remove or reassign those enrollments "
                "first."
            ),
        )

    session.delete(student)
    session.commit()


@router.get("/conversations", response_model=list[ConversationRead])
def list_conversations(
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[ConversationRead]:
    message_counts = dict(
        session.exec(
            select(Message.conversation_id, func.count()).group_by(
                Message.conversation_id
            )
        ).all()
    )
    conversations = session.exec(
        select(Conversation).order_by(Conversation.last_message_at.desc())
    ).all()

    return [
        ConversationRead(
            id=conv.id,
            started_at=conv.started_at,
            last_message_at=conv.last_message_at,
            message_count=message_counts.get(conv.id, 0),
        )
        for conv in conversations
    ]


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageRead],
)
def list_conversation_messages(
    conversation_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[MessageRead]:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.id)
    ).all()

    return [
        MessageRead(
            id=message.id,
            role=message.role,
            content=message.content,
            tool_called=message.tool_called,
            registration_link_given=message.registration_link_given,
            routed_to_whatsapp=message.routed_to_whatsapp,
            created_at=message.created_at,
        )
        for message in messages
    ]


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: int,
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> None:
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete messages first — messages.conversation_id references
    # conversations.id, so a conversation cannot be removed while its
    # messages still exist.
    messages = session.exec(
        select(Message).where(Message.conversation_id == conversation_id)
    ).all()
    for message in messages:
        session.delete(message)

    session.delete(conversation)
    session.commit()


@router.get(
    "/analytics/course-enrollments", response_model=list[CourseEnrollmentCount]
)
def course_enrollments_analytics(
    _admin: str = Depends(get_current_admin),
    session: Session = Depends(get_session),
) -> list[CourseEnrollmentCount]:
    """Enrollment totals per course (all statuses), most-enrolled first."""
    rows = session.exec(
        select(Course.id, Course.name, func.count(Enrollment.id))
        .select_from(Enrollment)
        .join(CoursePlan, CoursePlan.id == Enrollment.course_plan_id)
        .join(Course, Course.id == CoursePlan.course_id)
        .group_by(Course.id, Course.name)
        .order_by(func.count(Enrollment.id).desc(), Course.name.asc())
    ).all()

    return [
        CourseEnrollmentCount(
            course_id=row[0], course_name=row[1], enrollment_count=row[2]
        )
        for row in rows
    ]
