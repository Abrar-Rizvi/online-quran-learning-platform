from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel

from .student import utcnow


class Redirect(SQLModel, table=True):
    __tablename__ = "redirects"
    __table_args__ = (UniqueConstraint("from_path", name="uq_redirects_from_path"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    from_path: str = Field(sa_column=Column(Text, nullable=False))
    to_path: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=utcnow)
    created_by: Optional[str] = Field(default=None, sa_column=Column(Text))
