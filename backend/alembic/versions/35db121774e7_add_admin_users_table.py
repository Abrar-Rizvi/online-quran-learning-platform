"""add admin_users table

Revision ID: 35db121774e7
Revises: 087004d18de3
Create Date: 2026-11-23 00:23:24.150749

Creates the empty admin_users table. Schema only: no data is inserted or
touched, so this runs the same on any environment.
  - email is unique (ix_admin_users_email, unique=True)
  - role is restricted to owner / seo_editor by a plain CHECK constraint
    (ck_admin_users_role), the same approach as ck_blog_posts_status
  - is_active defaults to true and role defaults to seo_editor at the DB level
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '35db121774e7'
down_revision: Union[str, Sequence[str], None] = '087004d18de3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            'role',
            sqlmodel.sql.sqltypes.AutoString(),
            server_default='seo_editor',
            nullable=False,
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            server_default=sa.text('true'),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "role IN ('owner','seo_editor')", name='ck_admin_users_role'
        ),
    )
    op.create_index(
        'ix_admin_users_email', 'admin_users', ['email'], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_admin_users_email', table_name='admin_users')
    op.drop_table('admin_users')
