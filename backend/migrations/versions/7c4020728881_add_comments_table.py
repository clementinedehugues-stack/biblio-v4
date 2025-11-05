"""add comments table

Revision ID: 7c4020728881
Revises: af12bc34d567
Create Date: 2025-10-22 16:55:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7c4020728881'
down_revision: Union[str, Sequence[str], None] = 'af12bc34d567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_comments_book_id', 'comments', ['book_id'])
    op.create_index('ix_comments_user_id', 'comments', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_comments_user_id', table_name='comments')
    op.drop_index('ix_comments_book_id', table_name='comments')
    op.drop_table('comments')
