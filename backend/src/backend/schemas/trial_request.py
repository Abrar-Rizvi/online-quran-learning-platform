from datetime import datetime

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from ..models.trial_request import TrialRequestStatus
from .fields import COUNTRY_MAX, NAME_MAX, check_email, check_length, check_phone, strip


class TrialRequestCreate(SQLModel):
    name: str
    email: str
    whatsapp: str
    country: str

    @field_validator("name", "email", "whatsapp", "country", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        return strip(value)

    @field_validator("name")
    @classmethod
    def _valid_name(cls, value: str) -> str:
        return check_length(value, NAME_MAX)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, value: str) -> str:
        return check_email(value)

    @field_validator("whatsapp")
    @classmethod
    def _valid_whatsapp(cls, value: str) -> str:
        return check_phone(value)

    @field_validator("country")
    @classmethod
    def _valid_country(cls, value: str) -> str:
        return check_length(value, COUNTRY_MAX)


class TrialRequestRead(SQLModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    whatsapp: str
    country: str
    status: str
    created_at: datetime


class AdminTrialRequestRead(SQLModel):
    """One row of ``GET /admin/trial-requests``."""

    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    whatsapp: str
    country: str
    status: TrialRequestStatus
    created_at: datetime


class TrialRequestStatusUpdate(SQLModel):
    """Request body for ``PATCH /admin/trial-requests/{id}/status``."""

    status: TrialRequestStatus
