"""Field rules shared by the public forms (POST /enrollments, POST /trial-requests).

All text is trimmed first, then checked; errors become 422s naming the field.
"""

import re

NAME_MAX = 100
EMAIL_MAX = 254
PHONE_MAX = 32
COUNTRY_MAX = 64
PREFERRED_TIME_MAX = 64

# Deliberately light: exactly one "@", no whitespace, and a dot in the domain.
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def strip(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


def check_length(value: str, max_length: int) -> str:
    if not value:
        raise ValueError("must not be blank")
    if len(value) > max_length:
        raise ValueError(f"must be at most {max_length} characters")
    return value


def check_email(value: str) -> str:
    value = value.lower()
    if len(value) > EMAIL_MAX:
        raise ValueError(f"must be at most {EMAIL_MAX} characters")
    if not EMAIL_RE.match(value):
        raise ValueError("Enter a valid email address")
    return value


def check_half_hour(value):
    """New preferred times must be on the hour or half hour (classes are 30 minutes)."""
    if value.minute not in (0, 30) or value.second or value.microsecond:
        raise ValueError("Please choose a time on the hour or half hour.")
    return value


def check_phone(value: str) -> str:
    check_length(value, PHONE_MAX)
    digits = sum(ch.isdigit() for ch in value)
    if not 7 <= digits <= 15:
        raise ValueError("must contain 7 to 15 digits")
    return value
