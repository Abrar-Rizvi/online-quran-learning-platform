from datetime import datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel

from .student import utcnow


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(default_factory=utcnow)
    last_message_at: datetime = Field(default_factory=utcnow)

    messages: list["Message"] = Relationship(back_populates="conversation")
