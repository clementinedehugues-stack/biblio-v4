"""Book model with language enumeration and relationships."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import JSON, DateTime, Enum, String, func, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Language(str, enum.Enum):
    """Supported languages for books."""
    FR = "FR"
    EN = "EN"

if TYPE_CHECKING:  # pragma: no cover - imported for typing only
    from .document import Document
    from .category import Category


class Book(Base):
    """
    Book model representing library items.
    
    Attributes:
        id: Unique identifier
        title: Book title
        author: Book author
        description: Optional book description
        cover_image_url: Optional URL to cover image
        pdf_url: URL to the PDF file
        thumbnail_path: Auto-generated preview image path
        category: Category name (foreign key)
        tags: List of tags
        language: Book language
        created_at: Creation timestamp
        updated_at: Last update timestamp
        document: Related document (PDF)
        category_rel: Related category object
    """
    __tablename__ = "books"
    __table_args__ = (
        Index("ix_books_category", "category"),
        Index("ix_books_author", "author"),
        Index("ix_books_language", "language"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    pdf_url: Mapped[str] = mapped_column(String, nullable=False)
    # Auto-generated preview image for PDFs, stored as a URL to /uploads/thumbnails/*.jpg
    thumbnail_path: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("categories.name", ondelete="RESTRICT"),
        nullable=False,
    )
    tags: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    language: Mapped[Language] = mapped_column(
        Enum(
            Language,
            name="language",
            native_enum=False,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    documents: Mapped[List["Document"]] = relationship(
        "Document",
        back_populates="book",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    category_ref: Mapped["Category"] = relationship("Category", lazy="joined")

    @property
    def has_documents(self) -> bool:
        return bool(self.documents)
