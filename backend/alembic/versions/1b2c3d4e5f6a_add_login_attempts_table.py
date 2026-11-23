"""add login_attempts table

Revision ID: 1b2c3d4e5f6a
Revises: 9a8b7c6d5e4f
Create Date: 2026-11-23

Creates the login_attempts table (one row per POST /auth/login attempt), used
for the per-username / per-IP brute-force lockout. Schema only: no data is
inserted or touched.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '1b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '9a8b7c6d5e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'login_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('username', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('ip', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_login_attempts_created_at', 'login_attempts', ['created_at'], unique=False)
    op.create_index('ix_login_attempts_username', 'login_attempts', ['username'], unique=False)
    op.create_index('ix_login_attempts_ip', 'login_attempts', ['ip'], unique=False)
    op.create_index('ix_login_attempts_success', 'login_attempts', ['success'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_login_attempts_success', table_name='login_attempts')
    op.drop_index('ix_login_attempts_ip', table_name='login_attempts')
    op.drop_index('ix_login_attempts_username', table_name='login_attempts')
    op.drop_index('ix_login_attempts_created_at', table_name='login_attempts')
    op.drop_table('login_attempts')
