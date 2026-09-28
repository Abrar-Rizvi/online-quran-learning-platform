"""add enrollments.confirmation_token

Revision ID: 629d71d134e6
Revises: 9289495248ce
Create Date: 2026-09-28

The public enrollment confirmation page used to load an enrollment by its
sequential id (GET /enrollments/{id}), which exposed student details to
anyone who counted upwards. It now uses an unguessable token instead:
  1. Add confirmation_token as a nullable column.
  2. Backfill every existing row with its own secrets.token_urlsafe(32)
     value — whatever rows exist, looked up at run time (no hard-coded ids),
     so this behaves the same on every database.
  3. Make it NOT NULL and add the unique constraint
     uq_enrollments_confirmation_token (also the lookup index).
New rows get their token from the application (models.enrollment).
"""
import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '629d71d134e6'
down_revision: Union[str, Sequence[str], None] = '9289495248ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("enrollments", sa.Column("confirmation_token", sa.String(), nullable=True))

    conn = op.get_bind()
    ids = conn.execute(sa.text("SELECT id FROM enrollments WHERE confirmation_token IS NULL")).scalars().all()
    for enrollment_id in ids:
        conn.execute(
            sa.text("UPDATE enrollments SET confirmation_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(32), "id": enrollment_id},
        )

    op.alter_column("enrollments", "confirmation_token", nullable=False)
    op.create_unique_constraint(
        "uq_enrollments_confirmation_token", "enrollments", ["confirmation_token"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("uq_enrollments_confirmation_token", "enrollments", type_="unique")
    op.drop_column("enrollments", "confirmation_token")
