"""add students.whatsapp

Revision ID: 087004d18de3
Revises: 629d71d134e6
Create Date: 2026-09-29

Optional WhatsApp number from the enrollment form (when it differs from the
phone). Adds a nullable column only — no backfill, so it behaves the same on
every database. Downgrade drops it.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '087004d18de3'
down_revision: Union[str, Sequence[str], None] = '629d71d134e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("students", sa.Column("whatsapp", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("students", "whatsapp")
