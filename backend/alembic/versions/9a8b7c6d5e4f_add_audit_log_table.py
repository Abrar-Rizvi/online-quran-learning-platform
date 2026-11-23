"""add audit_log table

Revision ID: 9a8b7c6d5e4f
Revises: 35db121774e7
Create Date: 2026-11-23

Creates the audit_log table (one row per mutating admin action). Schema only:
no data is inserted or touched. before/after are JSONB snapshots; no password
or hash is ever written by the application.
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '9a8b7c6d5e4f'
down_revision: Union[str, Sequence[str], None] = '35db121774e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('actor_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('actor_role', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('action', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('entity_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('entity_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('before', JSONB(), nullable=True),
        sa.Column('after', JSONB(), nullable=True),
        sa.Column('ip', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_log_created_at', 'audit_log', ['created_at'], unique=False)
    op.create_index('ix_audit_log_actor_user_id', 'audit_log', ['actor_user_id'], unique=False)
    op.create_index('ix_audit_log_action', 'audit_log', ['action'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_audit_log_action', table_name='audit_log')
    op.drop_index('ix_audit_log_actor_user_id', table_name='audit_log')
    op.drop_index('ix_audit_log_created_at', table_name='audit_log')
    op.drop_table('audit_log')
