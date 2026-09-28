"""trial_requests status lifecycle: on_trial / enrolled / cancelled

Revision ID: 9289495248ce
Revises: 2f9d4e207482
Create Date: 2026-09-27

trial_requests.status was a free-form varchar defaulting to 'new'. Every
new person now starts on the academy's 5-day trial, so this change:
  1. Maps every existing value outside the new set (in practice 'new') to
     'on_trial' — a plain UPDATE by value, never by id, so it behaves the
     same on every database.
  2. Sets the column default to 'on_trial'.
  3. Adds a CHECK constraint (on_trial / enrolled / cancelled), mirroring
     ck_enrollments_status: a plain CHECK, not a native enum.

Downgrade drops the constraint, drops the database default again (before
this revision 'new' was supplied by the application, not the database) and
maps 'on_trial' back to 'new'. 'enrolled' and 'cancelled' rows are kept as-is
(the old column accepted any string).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9289495248ce'
down_revision: Union[str, Sequence[str], None] = '2f9d4e207482'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VALID_STATUSES = "('on_trial','enrolled','cancelled')"


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "UPDATE trial_requests "
        f"SET status = 'on_trial' WHERE status NOT IN {VALID_STATUSES}"
    )
    op.execute(
        "ALTER TABLE trial_requests ALTER COLUMN status SET DEFAULT 'on_trial'"
    )
    op.create_check_constraint(
        "ck_trial_requests_status",
        "trial_requests",
        f"status IN {VALID_STATUSES}",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_trial_requests_status", "trial_requests", type_="check")
    # The column had no database default before (the app supplied 'new').
    op.execute("ALTER TABLE trial_requests ALTER COLUMN status DROP DEFAULT")
    op.execute("UPDATE trial_requests SET status = 'new' WHERE status = 'on_trial'")
