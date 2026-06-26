"""add workspaces table

Introduces the ``workspaces`` table — the top-level container for a
DevCrew engagement. The schema is intentionally minimal at this stage:

* ``id``          UUID v4 primary key (from ``UUIDPrimaryKeyMixin``)
* ``name``        VARCHAR(100), NOT NULL
* ``description`` TEXT, nullable
* ``created_at``  TIMESTAMPTZ, NOT NULL, server_default=now()
* ``updated_at``  TIMESTAMPTZ, NOT NULL, server_default=now()

Slug, soft-delete flag, and additional indexes will be added in later
migrations as the feature set grows.

Revision ID: abff39cda22e
Revises: e344b2dff45f
Create Date: 2026-06-27 02:23:38.280390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "abff39cda22e"
down_revision: Union[str, Sequence[str], None] = "e344b2dff45f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the ``workspaces`` table."""
    op.create_table(
        "workspaces",
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    # ``created_at`` is the most common sort key in UIs, so an index
    # makes list endpoints efficient. Other indexes will be added as
    # query patterns emerge.
    op.create_index(
        op.f("ix_workspaces_created_at"),
        "workspaces",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the ``workspaces`` table."""
    op.drop_index(op.f("ix_workspaces_created_at"), table_name="workspaces")
    op.drop_table("workspaces")