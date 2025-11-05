"""merge heads: thumbnails + comments

Revision ID: cdef12345678
Revises: 7c4020728881, b123c456d789
Create Date: 2025-10-24 00:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "cdef12345678"
down_revision: Union[str, Sequence[str], None] = ("7c4020728881", "b123c456d789")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op merge
    pass


def downgrade() -> None:
    # No-op merge
    pass
