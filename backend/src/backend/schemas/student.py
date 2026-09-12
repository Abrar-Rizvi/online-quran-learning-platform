from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel


class StudentRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    country: Optional[str] = None
    created_at: datetime
