"""add unique constraint on course_plans course_id and days_per_week

Revision ID: b858f4a5e8fb
Revises: 983052d621ec
Create Date: 2026-08-20 16:39:23.006373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b858f4a5e8fb'
down_revision: Union[str, Sequence[str], None] = '983052d621ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_course_plans_course_days', 'course_plans', ['course_id', 'days_per_week'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_course_plans_course_days', 'course_plans', type_='unique')
