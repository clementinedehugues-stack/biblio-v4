"""Routes handling PDF document uploads and search capabilities."""

from __future__ import annotations

import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User
from ..schemas.book import BookRead
from ..schemas.document import DocumentRead
from ..models.document import Document
from ..models.book import Book
from ..services import books as books_service
from ..services import documents as documents_service
from ..services import cloudinary_service

router = APIRouter(prefix="/documents", tags=["documents"])

_UPLOAD_CHUNK_SIZE = 1024 * 1024
_MAX_UPLOAD_SIZE = int(os.getenv("PDF_UPLOAD_MAX_BYTES", str(60 * 1024 * 1024)))


def _public_base_url(request: Request) -> str:
    """Return the public base URL for building absolute file URLs.

    If the environment variable PUBLIC_API_BASE_URL is set, use it. Otherwise,
    fall back to the incoming request's base URL. Trailing slashes are stripped.
    """
    env = os.getenv("PUBLIC_API_BASE_URL", "").strip()
    if env:
        return env.rstrip("/")
    return str(request.base_url).rstrip("/")


@router.get("/", response_model=List[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[DocumentRead]:
    """List all uploaded documents (admin only)."""

    result = await session.execute(select(Document).order_by(Document.uploaded_at.desc()))
    documents = result.scalars().all()
    return [DocumentRead.from_model(d) for d in documents]


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    book_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> DocumentRead:
    """Upload a PDF, extract its text, and index it for full-text search."""

    content_type = (file.content_type or "").lower()
    if "pdf" not in content_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be a PDF")

    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    # Read file into memory for Cloudinary upload
    file_content = await file.read()
    if len(file_content) > _MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, 
            detail="Uploaded file exceeds size limit"
        )
    
    # Upload to Cloudinary (PDF + thumbnail)
    try:
        from io import BytesIO
        file_obj = BytesIO(file_content)

        # Use service helper to handle PDF upload and thumbnail generation properly
        pdf_public_id, thumbnail_public_id = await documents_service.upload_to_cloudinary(
            file_obj,
            book_id,
            generate_thumbnail=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload to Cloudinary: {str(exc)}"
        ) from exc
    finally:
        await file.close()

    # Also save locally for text extraction (temporary)
    upload_dir = documents_service.get_upload_dir()
    stored_name = documents_service.generate_storage_name(book_id, file.filename or "document.pdf")
    destination = upload_dir / stored_name
    
    try:
        with destination.open("wb") as buffer:
            buffer.write(file_content)
        
        content_text = documents_service.extract_pdf_text(destination)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Failed to parse PDF content"
        ) from exc
    finally:
        # Clean up local file after extraction
        destination.unlink(missing_ok=True)

    base = _public_base_url(request)

    try:
        async with session.begin():
            document = await documents_service.create_document(
                session,
                book=book,
                filename=stored_name,
                content_text=content_text,
                commit=False,
            )
            
            # Update book with Cloudinary IDs and URLs
            book.cloudinary_public_id = pdf_public_id
            if thumbnail_public_id:
                book.cloudinary_thumbnail_id = thumbnail_public_id
                book.thumbnail_path = cloudinary_service.get_thumbnail_url(thumbnail_public_id)
            # Optionally keep pdf_url in sync for any consumers relying on it
            if pdf_public_id:
                book.pdf_url = cloudinary_service.get_pdf_url(pdf_public_id)
            
            session.add(book)
    except Exception:
        raise

    await session.refresh(document)
    return DocumentRead.from_model(document)


@router.get("/search", response_model=List[BookRead])
async def search_documents(
    query: str = Query(..., min_length=1, max_length=255),
    session: AsyncSession = Depends(get_session),
) -> List[BookRead]:
    """Return books whose indexed documents contain the provided term."""

    books = await documents_service.search_books_by_query(session, query)
    return [BookRead.from_model(book) for book in books]


@router.post("/regenerate_thumbnails")
async def regenerate_thumbnails(
    request: Request,
    only_missing: bool = True,
    limit: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> dict:
    """Admin: regenerate JPEG thumbnails from PDFs for books.

    - only_missing: when True (default), only process books with no thumbnail_path
    - limit: process at most N books
    Returns a summary JSON with processed/updated/skipped counts.
    """
    q = select(Book).options(selectinload(Book.documents))
    if only_missing:
        q = q.where(Book.thumbnail_path.is_(None))
    if limit:
        q = q.limit(int(limit))

    result = await session.execute(q)
    candidates: list[Book] = list(result.scalars())

    processed = 0
    updated = 0
    skipped = 0
    base = _public_base_url(request)

    for book in candidates:
        processed += 1
        primary_doc = next(iter(book.documents), None)
        if primary_doc is None:
            skipped += 1
            continue
        try:
            pdf_path = documents_service.resolve_document_path(primary_doc.filename)
        except ValueError:
            skipped += 1
            continue
        if not pdf_path.exists():
            skipped += 1
            continue
        thumb_dir = documents_service.get_thumbnails_dir()
        thumb_filename = f"{book.id}_thumb.jpg"
        thumb_path = thumb_dir / thumb_filename
        try:
            if documents_service.generate_pdf_thumbnail(pdf_path, thumb_path):
                book.thumbnail_path = f"{base}/uploads/thumbnails/{thumb_filename}"
                session.add(book)
                updated += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1

    if updated:
        await session.commit()

    return {"processed": processed, "updated": updated, "skipped": skipped}
