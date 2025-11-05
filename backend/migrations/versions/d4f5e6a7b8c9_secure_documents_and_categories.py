"""secure documents and add category constraints

Revision ID: d4f5e6a7b8c9
Revises: cdef12345678
Create Date: 2025-10-25 14:00:00

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f5e6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "cdef12345678"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    categories = conn.execute(sa.text("SELECT DISTINCT category FROM books"))
    for row in categories:
        name = row[0]
        if name:
            conn.execute(
                sa.text(
                    "INSERT INTO categories (name) VALUES (:name) ON CONFLICT (name) DO NOTHING"
                ),
                {"name": name},
            )

    with op.batch_alter_table("books", schema=None) as batch_op:
        batch_op.drop_column("pdf_url")
        batch_op.create_foreign_key(
            "fk_books_category_categories",
            "categories",
            ["category"],
            ["name"],
            ondelete="RESTRICT",
        )

    op.create_index(op.f("ix_books_category"), "books", ["category"], unique=False)
    op.create_index(op.f("ix_books_author"), "books", ["author"], unique=False)
    op.create_index(op.f("ix_books_language"), "books", ["language"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_books_language"), table_name="books")
    op.drop_index(op.f("ix_books_author"), table_name="books")
    op.drop_index(op.f("ix_books_category"), table_name="books")

    with op.batch_alter_table("books", schema=None) as batch_op:
        batch_op.drop_constraint("fk_books_category_categories", type_="foreignkey")
        batch_op.add_column(sa.Column("pdf_url", sa.String(), nullable=False, server_default=""))

    conn = op.get_bind()
    conn.execute(sa.text("UPDATE books SET pdf_url = ''"))