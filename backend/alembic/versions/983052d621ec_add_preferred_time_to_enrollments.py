"""add preferred_time to enrollments

Revision ID: 983052d621ec
Revises: 3658fbf11fd0
Create Date: 2026-08-20 15:59:18.077574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '983052d621ec'
down_revision: Union[str, Sequence[str], None] = '3658fbf11fd0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('enrollments', sa.Column('preferred_time', sa.Time(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('enrollments', 'preferred_time')
