"""add course SEO fields

Revision ID: 91c4de2a7b60
Revises: 5e7b3a9c2d41
"""

import sqlalchemy as sa
from alembic import op

revision = "91c4de2a7b60"
down_revision = "5e7b3a9c2d41"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("meta_title", sa.String(255), nullable=True))
    op.add_column("courses", sa.Column("meta_description", sa.String(500), nullable=True))
    op.add_column("courses", sa.Column("seo_content", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "seo_content")
    op.drop_column("courses", "meta_description")
    op.drop_column("courses", "meta_title")
