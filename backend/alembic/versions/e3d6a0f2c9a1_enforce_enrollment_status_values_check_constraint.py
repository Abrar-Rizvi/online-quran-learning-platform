"""enforce enrollment status values via CHECK constraint

Revision ID: e3d6a0f2c9a1
Revises: 085f7e99922b
Create Date: 2026-09-06

The enrollments.status column was a free-form varchar. This change:
  1. Re-maps any legacy value outside the new set to the default
     ('on_trial') so the constraint can be added safely.
  2. Sets the column default to 'on_trial' (every new enrollment starts
     as a free trial).
  3. Adds a CHECK constraint restricting status to on_trial / active /
     cancelled / alumni (a plain CHECK, not a native enum, to keep future
     changes a simple migration away).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e3d6a0f2c9a1'
down_revision: Union[str, Sequence[str], None] = '085f7e99922b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VALID_STATUSES = "('on_trial','active','cancelled','alumni')"


def upgrade() -> None:
    """Upgrade schema."""
    # Defensive: map any unknown legacy status to the trial default so the
    # CHECK constraint below cannot fail against existing data.
    op.execute(
        "UPDATE enrollments "
        f"SET status = 'on_trial' WHERE status NOT IN {VALID_STATUSES}"
    )

    op.execute(
        "ALTER TABLE enrollments ALTER COLUMN status SET DEFAULT 'on_trial'"
    )

    op.create_check_constraint(
        "ck_enrollments_status",
        "enrollments",
        f"status IN {VALID_STATUSES}",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_enrollments_status", "enrollments", type_="check")
    op.execute("ALTER TABLE enrollments ALTER COLUMN status DROP DEFAULT")
