from datetime import datetime

from sqlalchemy import Column, DateTime, Text, UniqueConstraint, false, func
from sqlmodel import Field, SQLModel


class ImageAlt(SQLModel, table=True):
    __tablename__ = "image_alts"
    __table_args__ = (UniqueConstraint("image_path", name="uq_image_alts_image_path"),)

    id: int | None = Field(default=None, primary_key=True)
    image_path: str = Field(sa_type=Text)
    alt_text: str = Field(sa_type=Text)
    is_decorative: bool = Field(default=False, sa_column_kwargs={"server_default": false()})
    created_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
    updated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )
