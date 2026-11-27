"""Local paths accepted for a course photo."""

import re
from urllib.parse import unquote

COURSE_IMAGE_PREFIX = "/images/courses/"
COURSE_IMAGE_PATH_MAX_LENGTH = 255
COURSE_IMAGE_EXTENSIONS = (".webp", ".jpg", ".jpeg", ".png")


def validate_course_image_path(value: str | None) -> str | None:
    if value is None or value == "":
        return None
    if len(value) > COURSE_IMAGE_PATH_MAX_LENGTH:
        raise ValueError("Use an image path up to 255 characters.")

    error = "Use a local path under /images/courses/ without traversal, a query string, or a fragment."
    if not value.startswith(COURSE_IMAGE_PREFIX) or re.search(r"%(?![0-9a-fA-F]{2})", value):
        raise ValueError(error)
    for segment in value[len(COURSE_IMAGE_PREFIX):].split("/"):
        try:
            name = unquote(segment, errors="strict")
        except UnicodeDecodeError:
            raise ValueError(error) from None
        if not name or name == "." or ".." in name or re.search(r"[/\\:?#%\x00-\x1f\x7f]", name):
            raise ValueError(error)
    if not value.lower().endswith(COURSE_IMAGE_EXTENSIONS):
        raise ValueError("Use a .webp, .jpg, .jpeg, or .png image.")
    return value
