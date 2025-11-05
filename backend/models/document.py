"""Document model storing uploaded PDF metadata and extracted text.

Notes:
- We use a GIN index with trigram ops on ``content_text`` to support ILIKE
    searches efficiently without exceeding Postgres btree row size limits.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:  # pragma: no cover - type checking only
    from .book import Book


class Document(Base):
    """Represents an uploaded PDF associated with a book."""

    __tablename__ = "documents"
    # Trigram GIN index for full-text-like ILIKE searches on large text fields
    __table_args__ = (
        Index(
            "ix_documents_content_text",
            "content_text",
            postgresql_using="gin",
            postgresql_ops={"content_text": "gin_trgm_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    book: Mapped["Book"] = relationship(
        "Book", back_populates="documents", lazy="joined"
    )

