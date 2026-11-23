from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RedirectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_path: str
    to_path: str


class PublicRedirect(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    from_path: str
    to_path: str


class RedirectRead(PublicRedirect):
    id: int
    created_at: datetime
    created_by: str | None
