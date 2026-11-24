"""Add image alt text overrides.

Revision ID: c19a7d4e2b63
Revises: 91c4de2a7b60
"""

import sqlalchemy as sa
from alembic import op

revision = "c19a7d4e2b63"
down_revision = "91c4de2a7b60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "image_alts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("image_path", sa.Text(), nullable=False),
        sa.Column("alt_text", sa.Text(), nullable=False),
        sa.Column("is_decorative", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("image_path", name="uq_image_alts_image_path"),
    )


def downgrade() -> None:
    op.drop_table("image_alts")
