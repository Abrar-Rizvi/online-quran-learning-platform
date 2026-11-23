"""add redirects table

Revision ID: 4c2a7e9b1d60
Revises: 1b2c3d4e5f6a
"""

from alembic import op
import sqlalchemy as sa

revision = "4c2a7e9b1d60"
down_revision = "1b2c3d4e5f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "redirects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("from_path", sa.Text(), nullable=False),
        sa.Column("to_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("from_path", name="uq_redirects_from_path"),
    )


def downgrade() -> None:
    op.drop_table("redirects")
