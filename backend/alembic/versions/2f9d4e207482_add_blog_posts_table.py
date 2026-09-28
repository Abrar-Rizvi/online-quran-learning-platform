"""add blog_posts table

Revision ID: 2f9d4e207482
Revises: 13a256e5f03c
Create Date: 2026-09-25 11:21:34

Creates the empty blog_posts table. Schema only: no data is inserted or
touched, so this runs the same on any environment.
  - slug is unique (uq_blog_posts_slug)
  - status is restricted to draft / published by a plain CHECK constraint
    (ck_blog_posts_status), the same approach as ck_enrollments_status
  - composite index on (status, published_at) for the public listing
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '2f9d4e207482'
down_revision: Union[str, Sequence[str], None] = '13a256e5f03c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'blog_posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('slug', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('excerpt', sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('cover_image_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            'status',
            sqlmodel.sql.sqltypes.AutoString(),
            server_default='draft',
            nullable=False,
        ),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug', name='uq_blog_posts_slug'),
        sa.CheckConstraint(
            "status IN ('draft','published')", name='ck_blog_posts_status'
        ),
    )
    op.create_index(
        'ix_blog_posts_status_published_at',
        'blog_posts',
        ['status', 'published_at'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_blog_posts_status_published_at', table_name='blog_posts')
    op.drop_table('blog_posts')
