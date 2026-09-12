from typing import Optional

from sqlmodel import Field, SQLModel


class ChatRequest(SQLModel):
    message: str = Field(min_length=1)
    conversation_id: Optional[int] = None


class ChatResponse(SQLModel):
    reply: str
    conversation_id: int
