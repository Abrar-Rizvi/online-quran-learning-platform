import re

COURSE_SLUG_MAX_LENGTH = 100
COURSE_SLUG_PATTERN = r"^[a-z0-9]+(-[a-z0-9]+)*$"
LEGACY_QAIDA_SLUG = "qaida-for-beginners"
NOORANI_QAIDA_SLUG = "noorani-qaida-course"


def validate_course_slug(slug: str) -> str:
    """Validate a stored course slug without rewriting it."""
    if len(slug) > COURSE_SLUG_MAX_LENGTH or not re.fullmatch(COURSE_SLUG_PATTERN, slug):
        raise ValueError(
            "Course slug must be 1–100 lowercase letters or digits, "
            "with single hyphens between words."
        )
    return slug


def slug_from_course_name(name: str) -> str:
    """Generate the legacy URL slug for a newly seeded course."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return validate_course_slug(slug)
