"""initial baseline

This is the root of the DevCrew AI migration history. It is intentionally
empty: the database foundation (declarative ``Base``, mixins, and engine)
was just established and no application tables exist yet. Subsequent
migrations will introduce ``Workspace``, ``Timeline``, ``Approval``, and
other domain tables via ``alembic revision --autogenerate``.

Revision ID: e344b2dff45f
Revises:
Create Date: 2026-06-27 02:07:00.056807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e344b2dff45f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
