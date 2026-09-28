from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel

from .student import utcnow


class TrialRequestStatus(str, Enum):
    """The only valid values for ``trial_requests.status``.

    Mirrors the DB-level CHECK constraint ``ck_trial_requests_status``. Like an
    enrollment, every request starts on the academy's 5-day trial and then
    either continues (enrolled) or doesn't (cancelled).
    """

    ON_TRIAL = "on_trial"
    ENROLLED = "enrolled"
    CANCELLED = "cancelled"


# Every new trial request starts on trial.
DEFAULT_TRIAL_REQUEST_STATUS = TrialRequestStatus.ON_TRIAL

VALID_TRIAL_REQUEST_STATUSES = frozenset(s.value for s in TrialRequestStatus)

# Allowed status changes; enrolled and cancelled are terminal.
TRIAL_REQUEST_TRANSITIONS: dict[TrialRequestStatus, set[TrialRequestStatus]] = {
    TrialRequestStatus.ON_TRIAL: {TrialRequestStatus.ENROLLED, TrialRequestStatus.CANCELLED},
    TrialRequestStatus.ENROLLED: set(),
    TrialRequestStatus.CANCELLED: set(),
}


def can_transition_trial_request(
    current: TrialRequestStatus, target: TrialRequestStatus
) -> bool:
    """Return whether moving from ``current`` to ``target`` is allowed."""
    return target in TRIAL_REQUEST_TRANSITIONS.get(current, set())


class TrialRequest(SQLModel, table=True):
    """A lightweight "Book a Free Trial" lead.

    Deliberately separate from ``Student``/``Enrollment``: it collects no course
    or plan and has no stored link to the students table (the admin converts a
    request by creating an enrollment, then marking the request enrolled).
    """

    __tablename__ = "trial_requests"
    __table_args__ = (
        CheckConstraint(
            "status IN ('on_trial','enrolled','cancelled')",
            name="ck_trial_requests_status",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    whatsapp: str
    country: str
    status: str = Field(default=DEFAULT_TRIAL_REQUEST_STATUS.value, index=True)
    created_at: datetime = Field(default_factory=utcnow)
