"""add course slugs

Revision ID: 5e7b3a9c2d41
Revises: 4c2a7e9b1d60
"""

import re

import sqlalchemy as sa
from alembic import op

revision = "5e7b3a9c2d41"
down_revision = "4c2a7e9b1d60"
branch_labels = None
depends_on = None


def _backfill_values(courses):
    """Freeze the original frontend toSlug algorithm in the migration."""
    names_by_slug = {}
    values = []
    for course_id, name in courses:
        slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
        if not slug or len(slug) > 100:
            raise RuntimeError(
                f"Course {course_id} ({name!r}) has an empty or overlong legacy slug {slug!r}."
            )
        if slug in names_by_slug:
            other_id, other_name = names_by_slug[slug]
            raise RuntimeError(
                f"Duplicate course slug {slug!r}: {other_id} ({other_name!r}) "
                f"and {course_id} ({name!r})."
            )
        names_by_slug[slug] = (course_id, name)
        values.append({"course_id": course_id, "slug": slug})
    return values


def upgrade() -> None:
    op.add_column("courses", sa.Column("slug", sa.String(100), nullable=True))
    connection = op.get_bind()
    courses = connection.execute(sa.text("SELECT id, name FROM courses ORDER BY id"))
    values = _backfill_values(courses)
    if values:
        connection.execute(
            sa.text("UPDATE courses SET slug = :slug WHERE id = :course_id"), values
        )
    op.alter_column("courses", "slug", existing_type=sa.String(100), nullable=False)
    op.create_index("ix_courses_slug", "courses", ["slug"], unique=True)
    op.create_check_constraint(
        "ck_courses_slug_format", "courses", "slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'"
    )


def downgrade() -> None:
    op.drop_constraint("ck_courses_slug_format", "courses", type_="check")
    op.drop_index("ix_courses_slug", table_name="courses")
    op.drop_column("courses", "slug")
