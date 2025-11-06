"""Service helpers for PDF document storage and indexing."""

from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import BinaryIO

from PIL import Image
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.security import TokenDecodeError, create_access_token, safe_decode_token
from . import cloudinary_service
from ..models import Book, Document

# Default to a writable project-relative uploads directory.
# Can be overridden via the UPLOAD_DIR env variable.
DEFAULT_UPLOAD_DIR = (Path(__file__).resolve().parents[2] / "uploads").resolve()
_FILENAME_SANITIZER = re.compile(r"[^A-Za-z0-9_.-]+")
_STREAM_SCOPE = "document:stream"


def get_upload_dir() -> Path:
    """Return the configured upload directory, ensuring it exists."""

    raw_path = os.getenv("UPLOAD_DIR", str(DEFAULT_UPLOAD_DIR))
    upload_dir = Path(raw_path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def thumbnails_generation_enabled() -> bool:
    """Return True if thumbnail generation should run on upload.

    Controlled by env var GENERATE_THUMBNAILS_ON_UPLOAD (default: false).
    """
    raw = os.getenv("GENERATE_THUMBNAILS_ON_UPLOAD", "false").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def generate_storage_name(book_id: uuid.UUID, original_name: str) -> str:
    """Generate a deterministic filename safe for filesystem storage."""

    base_name = Path(original_name).name or "document.pdf"
    sanitized = _FILENAME_SANITIZER.sub("_", base_name)
    return f"{book_id}_{sanitized}"


def get_thumbnails_dir() -> Path:
    """Return the thumbnails directory under the upload dir, ensuring it exists."""
    # Do not eagerly create the directory here to avoid side effects in tests
    # that expect no extra folders unless a thumbnail is actually generated.
    # The directory will be created on demand inside generate_pdf_thumbnail().
    return get_upload_dir() / "thumbnails"


def generate_pdf_thumbnail(pdf_path: Path, thumbnail_path: Path, *, size: int = 512) -> bool:
    """Generate a JPEG thumbnail from the first page of a PDF.

    Returns True on success, False otherwise. Any error is swallowed to avoid
    breaking the upload flow when poppler or pdf2image isn't available.
    """
    try:
        # Lazy import so environments without poppler can still run the app
        from pdf2image import convert_from_path  # type: ignore
        images = convert_from_path(str(pdf_path), first_page=1, last_page=1, size=size)
        if not images:
            return False
        img = images[0]
        thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(thumbnail_path), format="JPEG", quality=85)
        return True
    except Exception:
        # Log could be added here if a logger is available
        return False


def extract_pdf_text(file_path: Path) -> str:
    """Extract textual content from a PDF file using PyPDF2."""

    reader = PdfReader(str(file_path))
    text_chunks: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text_chunks.append(page_text)
    return "\n".join(chunk.strip() for chunk in text_chunks if chunk.strip())


def resolve_document_path(filename: str) -> Path:
    """Return the absolute path of a stored document, ensuring sandbox safety."""

    upload_dir = get_upload_dir().resolve()
    candidate = (upload_dir / filename).resolve()
    try:
        is_within = candidate.is_relative_to(upload_dir)  # type: ignore[attr-defined]
    except AttributeError:  # Python < 3.9 fallback
        upload_dir_resolved = upload_dir
        is_within = upload_dir_resolved == candidate or upload_dir_resolved in candidate.parents
    if not is_within:
        raise ValueError("Resolved document path escapes upload directory")
    return candidate


async def create_document(
    session: AsyncSession,
    *,
    book: Book,
    filename: str,
    content_text: str,
    commit: bool = True,
) -> Document:
    """Persist a new document record linked to the provided book."""

    document = Document(
        book_id=book.id,
        filename=filename,
        content_text=content_text,
    )
    session.add(document)
    if commit:
        await session.commit()
        await session.refresh(document)
    else:
        await session.flush()
    return document


async def search_books_by_query(session: AsyncSession, query: str) -> list[Book]:
    """Return books whose indexed document content matches the query (cross-dialect).

    Avoids PostgreSQL-specific DISTINCT ON by first selecting distinct IDs, then fetching rows.
    """

    id_stmt = (
        select(Book.id)
        .join(Document, Document.book_id == Book.id)
        .where(Document.content_text.ilike(f"%{query}%"))
        .distinct()
    )
    id_result = await session.execute(id_stmt)
    ids = list(id_result.scalars())
    if not ids:
        return []
    books_stmt = select(Book).where(Book.id.in_(ids))
    books_result = await session.execute(books_stmt)
    return list(books_result.scalars())


async def get_primary_document(session: AsyncSession, book_id: uuid.UUID) -> Document | None:
    stmt = (
        select(Document)
        .where(Document.book_id == book_id)
        .order_by(Document.uploaded_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


def create_stream_token(book_id: uuid.UUID, user_id: uuid.UUID) -> tuple[str, datetime]:
    ttl = settings.document_stream_token_ttl_seconds
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)
    token = create_access_token(
        subject=str(book_id),
        expires_delta=timedelta(seconds=ttl),
        extra_claims={
            "scope": _STREAM_SCOPE,
            "book_id": str(book_id),
            "user_id": str(user_id),
            "exp_at": int(expires_at.timestamp()),
        },
    )
    return token, expires_at


def verify_stream_token(token: str, *, expected_book_id: uuid.UUID) -> dict[str, object]:
    try:
        payload = safe_decode_token(token)
    except TokenDecodeError as exc:  # pragma: no cover
        raise TokenDecodeError("Invalid document token", exc)

    if payload.get("scope") != _STREAM_SCOPE:
        raise TokenDecodeError("Token scope mismatch")
    if payload.get("sub") != str(expected_book_id):
        raise TokenDecodeError("Token subject mismatch")
    return payload


async def upload_to_cloudinary(
    file: BinaryIO,
    book_id: uuid.UUID,
    generate_thumbnail: bool = True,
) -> tuple[str, str | None]:
    """
    Upload PDF to Cloudinary and optionally generate thumbnail.
    
    Args:
        file: Binary file object containing the PDF
        book_id: UUID of the book
        generate_thumbnail: Whether to generate and upload thumbnail
        
    Returns:
        Tuple of (cloudinary_public_id, thumbnail_public_id or None)
    """
    # Upload PDF
    pdf_public_id = cloudinary_service.upload_pdf(file, str(book_id))
    
    thumbnail_public_id = None
    if generate_thumbnail:
        try:
            # Reset file pointer
            file.seek(0)
            
            # Generate thumbnail from first page
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(file.read(), first_page=1, last_page=1, size=512)
            
            if images:
                img = images[0]
                # Upload thumbnail to Cloudinary
                thumbnail_public_id = cloudinary_service.upload_thumbnail(img, str(book_id))
        except Exception:
            # Thumbnail generation is optional, don't fail the upload
            pass
    
    return pdf_public_id, thumbnail_public_id

    return payload
