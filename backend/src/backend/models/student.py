from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Student(SQLModel, table=True):
    __tablename__ = "students"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    phone: Optional[str] = None
    country: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utcnow)

    enrollments: list["Enrollment"] = Relationship(back_populates="student")
