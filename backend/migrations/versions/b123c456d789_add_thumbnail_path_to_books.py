"""add thumbnail_path column to books

Revision ID: b123c456d789
Revises: af12bc34d567
Create Date: 2025-10-24 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b123c456d789"
down_revision: Union[str, Sequence[str], None] = "af12bc34d567"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("books", sa.Column("thumbnail_path", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("books", "thumbnail_path")
