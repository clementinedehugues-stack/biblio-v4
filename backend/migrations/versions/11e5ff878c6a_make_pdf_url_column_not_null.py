"""make pdf_url column not null

Revision ID: 11e5ff878c6a
Revises: 932de91f7bb3
Create Date: 2025-10-26 12:53:50.961119

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '11e5ff878c6a'
down_revision: Union[str, Sequence[str], None] = '932de91f7bb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("books", "pdf_url", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("books", "pdf_url", nullable=True)
