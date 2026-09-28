"""add registration_no to students

Revision ID: 13a256e5f03c
Revises: a6c639f6bc4e
Create Date: 2026-09-23 06:37:04.140724

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13a256e5f03c'
down_revision: Union[str, Sequence[str], None] = 'a6c639f6bc4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Existing students are backfilled with explicit AOA-1001..1006 values below (approved
    # mapping, ordered by id). The sequence starts at 1007 so the first newly-created student
    # continues right after the backfilled range.
    op.execute("CREATE SEQUENCE IF NOT EXISTS students_registration_no_seq START WITH 1007")

    op.add_column("students", sa.Column("registration_no", sa.String(), nullable=True))

    backfill = [
        (3, "AOA-1001"),
        (15, "AOA-1002"),
        (16, "AOA-1003"),
        (17, "AOA-1004"),
        (18, "AOA-1005"),
        (19, "AOA-1006"),
    ]
    for student_id, registration_no in backfill:
        op.execute(
            sa.text(
                "UPDATE students SET registration_no = :registration_no "
                "WHERE id = :student_id AND registration_no IS NULL"
            ).bindparams(registration_no=registration_no, student_id=student_id)
        )

    op.execute(
        "ALTER TABLE students ALTER COLUMN registration_no "
        "SET DEFAULT ('AOA-' || nextval('students_registration_no_seq'))"
    )
    op.execute("ALTER SEQUENCE students_registration_no_seq OWNED BY students.registration_no")
    op.alter_column("students", "registration_no", nullable=False)
    op.create_unique_constraint("uq_students_registration_no", "students", ["registration_no"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_students_registration_no", "students", type_="unique")
    op.drop_column("students", "registration_no")
    # OWNED BY should have dropped the sequence along with the column; this is a defensive
    # no-op if it already did.
    op.execute("DROP SEQUENCE IF EXISTS students_registration_no_seq")
