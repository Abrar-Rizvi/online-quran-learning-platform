"""trial_requests country required

Revision ID: a6c639f6bc4e
Revises: 3890210e2de4
Create Date: 2026-09-23 03:14:34.396509

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a6c639f6bc4e'
down_revision: Union[str, Sequence[str], None] = '3890210e2de4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("UPDATE trial_requests SET country = '' WHERE country IS NULL")
    op.alter_column(
        "trial_requests", "country", existing_type=sa.String(), nullable=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "trial_requests", "country", existing_type=sa.String(), nullable=True
    )
