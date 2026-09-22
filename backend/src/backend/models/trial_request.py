from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from .student import utcnow

# Every new trial request starts as "new". A plain string (no CHECK constraint yet):
# the lifecycle is undecided and no admin UI manages it in this phase.
DEFAULT_TRIAL_REQUEST_STATUS = "new"


class TrialRequest(SQLModel, table=True):
    """A lightweight "Book a Free Trial" lead.

    Deliberately separate from ``Student``/``Enrollment``: it collects no course
    or plan and is never deduped or linked against the students table.
    """

    __tablename__ = "trial_requests"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str
    whatsapp: str
    country: Optional[str] = None
    status: str = Field(default=DEFAULT_TRIAL_REQUEST_STATUS, index=True)
    created_at: datetime = Field(default_factory=utcnow)
