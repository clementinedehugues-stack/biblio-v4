"""merge heads: trigram index + user changes

Revision ID: 9f8e7d6c5b4a
Revises: 26312aa6760a, a1b2c3d4e5f6
Create Date: 2025-10-22 16:25:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "9f8e7d6c5b4a"
down_revision: Union[str, Sequence[str], None] = ("26312aa6760a", "a1b2c3d4e5f6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op merge
    pass


def downgrade() -> None:
    # No-op merge
    pass
