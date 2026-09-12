from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, Relationship, SQLModel

from .student import utcnow


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id", index=True)
    role: str
    content: str = Field(sa_column=Column(Text, nullable=False))
    tool_called: Optional[str] = Field(default=None)
    registration_link_given: bool = Field(default=False)
    routed_to_whatsapp: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utcnow)

    conversation: "Conversation" = Relationship(back_populates="messages")
