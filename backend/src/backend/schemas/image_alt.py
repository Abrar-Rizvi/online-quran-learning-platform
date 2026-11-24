import re
from datetime import datetime
from urllib.parse import quote, unquote

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator


class ImageAltRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alt_text: str
    is_decorative: bool


class AdminImageAltRead(ImageAltRead):
    id: int
    image_path: str
    created_at: datetime
    updated_at: datetime


class ImageAltWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_decorative: bool = False
    alt_text: str = Field(default="", max_length=125, validate_default=True)

    @field_validator("alt_text")
    @classmethod
    def validate_alt_text(cls, value: str, info: ValidationInfo) -> str:
        if "\0" in value:
            raise ValueError("Alt text cannot contain a null character.")
        text = value.strip()
        if not text and not info.data.get("is_decorative"):
            raise ValueError("Enter alt text or mark the image as decorative.")
        return text


class ImageAltCreate(ImageAltWrite):
    image_path: str = Field(max_length=2048)

    @field_validator("image_path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        error = "Use a local file path under /images/, without a query or fragment."
        path = value.strip()
        if not path.startswith("/images/") or re.search(r"[?#]|%(?![0-9a-fA-F]{2})", path):
            raise ValueError(error)
        parts = []
        for segment in path[len("/images/"):].split("/"):
            try:
                name = unquote(segment, errors="strict")
            except UnicodeDecodeError:
                raise ValueError(error) from None
            if name.strip() in {"", ".", ".."} or re.search(r"[/\\:%\x00-\x1f\x7f]", name):
                raise ValueError(error)
            parts.append(quote(name, safe="!'()*-._~"))
        normalized = "/images/" + "/".join(parts)
        if len(normalized) > 2048:
            raise ValueError("Use an image path up to 2048 characters.")
        return normalized
