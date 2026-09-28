from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel


class StudentRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    country: Optional[str] = None
    registration_no: str
    created_at: datetime
