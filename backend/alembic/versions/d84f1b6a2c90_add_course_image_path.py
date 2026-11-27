"""Add a nullable course image path.

Revision ID: d84f1b6a2c90
Revises: c19a7d4e2b63
"""

import sqlalchemy as sa
from alembic import op

revision = "d84f1b6a2c90"
down_revision = "c19a7d4e2b63"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("image_path", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "image_path")
