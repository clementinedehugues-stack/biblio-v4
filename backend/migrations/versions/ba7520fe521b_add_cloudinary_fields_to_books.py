"""Add cloudinary fields to books

Revision ID: ba7520fe521b
Revises: 11e5ff878c6a
Create Date: 2025-11-06 16:51:32.513363

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba7520fe521b'
down_revision: Union[str, Sequence[str], None] = '11e5ff878c6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add cloudinary storage fields to books table
    op.add_column('books', sa.Column('cloudinary_public_id', sa.String(), nullable=True))
    op.add_column('books', sa.Column('cloudinary_thumbnail_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove cloudinary fields
    op.drop_column('books', 'cloudinary_thumbnail_id')
    op.drop_column('books', 'cloudinary_public_id')
