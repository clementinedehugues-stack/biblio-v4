"""switch documents content_text index to GIN trigram

Revision ID: a1b2c3d4e5f6
Revises: 7c4020728880
Create Date: 2025-10-22 16:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "7c4020728880"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pg_trgm extension exists for gin_trgm_ops
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Drop the existing btree index if present
    op.execute("DROP INDEX IF EXISTS ix_documents_content_text")

    # Create GIN index with trigram ops for efficient ILIKE searches
    op.execute(
        """
        CREATE INDEX ix_documents_content_text
        ON documents
        USING GIN (content_text gin_trgm_ops)
        """
    )


def downgrade() -> None:
    # Drop GIN index
    op.execute("DROP INDEX IF EXISTS ix_documents_content_text")

    # Recreate simple btree index (note: may hit size limits on large rows)
    op.create_index(
        "ix_documents_content_text",
        "documents",
        ["content_text"],
        unique=False,
    )
