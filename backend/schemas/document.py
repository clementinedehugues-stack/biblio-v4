"""Pydantic schemas for document upload and indexing operations."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

try:  # Pydantic v2
    from pydantic import ConfigDict  # type: ignore
    _PYDANTIC_V2 = True
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore
    _PYDANTIC_V2 = False


class DocumentRead(BaseModel):
    """Represents a stored document returned by the API."""

    id: uuid.UUID
    book_id: uuid.UUID
    filename: str = Field(..., description="Stored filename on disk")
    uploaded_at: datetime
    if _PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)  # type: ignore[name-defined]
    else:  # pragma: no cover - Pydantic v1 fallback
        class Config:  # type: ignore[no-redef]
            orm_mode = True

    @classmethod
    def from_model(cls, document: object) -> "DocumentRead":
        """Create a schema instance from an ORM document model."""

        if hasattr(cls, "model_validate"):
            return cls.model_validate(document)  # type: ignore[attr-defined]
        return cls.from_orm(document)


class DocumentSearchResult(BaseModel):
    """Represents a book matched by a document full-text query."""

    book_id: uuid.UUID
    snippet: str = Field(..., description="Extract of the matching content")


class DocumentStreamToken(BaseModel):
    """Token payload returned when requesting access to a protected document stream."""

    token: str = Field(..., description="Short-lived token granting access to the stream endpoint")
    expires_at: datetime = Field(..., description="UTC timestamp when the token expires")
    stream_endpoint: str = Field(..., description="Relative endpoint to stream the document")
    ttl_seconds: int = Field(..., ge=1, description="Token lifetime in seconds")