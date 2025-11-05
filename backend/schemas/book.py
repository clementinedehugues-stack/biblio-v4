from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, AnyUrl
try:  # Pydantic v2 support
    from pydantic import ConfigDict  # type: ignore
    _PYDANTIC_V2 = True
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore
    _PYDANTIC_V2 = False

from ..models.book import Language


class BookBase(BaseModel):
    title: str = Field(..., max_length=500)
    author: str = Field(..., max_length=255)
    description: Optional[str] = None
    cover_image_url: Optional[AnyUrl] = None
    # Auto-generated preview of the PDF if available
    thumbnail_path: Optional[AnyUrl] = None
    category: str = Field(..., max_length=128)
    tags: List[str] = Field(default_factory=list)
    language: Language


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[AnyUrl] = None
    thumbnail_path: Optional[AnyUrl] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    language: Optional[Language] = None


class BookRead(BookBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    has_document: bool = Field(..., description="Indicates if the book has at least one stored document")
    stream_endpoint: Optional[str] = Field(default=None, description="Relative path to request a streaming token")
    if _PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)  # type: ignore[name-defined]
    else:
        class Config:  # type: ignore[no-redef]
            orm_mode = True

    @classmethod
    def from_model(cls, book: object) -> "BookRead":
        data = {
            "id": getattr(book, "id"),
            "title": getattr(book, "title"),
            "author": getattr(book, "author"),
            "description": getattr(book, "description"),
            "cover_image_url": getattr(book, "cover_image_url", None),
            "thumbnail_path": getattr(book, "thumbnail_path", None),
            "category": getattr(book, "category"),
            "tags": list(getattr(book, "tags", []) or []),
            "language": getattr(book, "language"),
            "created_at": getattr(book, "created_at"),
            "updated_at": getattr(book, "updated_at"),
            "has_document": bool(getattr(book, "has_documents", False) or getattr(book, "documents", [])),
            "stream_endpoint": (
                f"/books/{getattr(book, 'id')}/stream" if bool(getattr(book, "documents", [])) else None
            ),
        }
        if hasattr(cls, "model_validate"):
            return cls.model_validate(data)  # type: ignore[attr-defined]
        return cls(**data)
