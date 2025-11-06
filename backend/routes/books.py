from __future__ import annotations

import os
import uuid
from typing import AsyncIterator, Iterator, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import (
    get_current_user,
    get_optional_current_user,
    require_admin_user,
)
from ..database import get_session
from ..schemas.book import BookCreate, BookRead, BookUpdate
from ..schemas.document import DocumentStreamToken
from ..services import books as books_service
from ..services import documents as documents_service
from ..services import categories as categories_service
from ..models.user import UserRole
from ..models.book import Book, Language
from ..core.config import settings
from ..core.security import TokenDecodeError

router = APIRouter(prefix="/books", tags=["books"])

_UPLOAD_CHUNK_SIZE = 1024 * 1024
_MAX_UPLOAD_SIZE = int(os.getenv("PDF_UPLOAD_MAX_BYTES", str(60 * 1024 * 1024)))


@router.get("/", response_model=List[BookRead])
async def list_books(
    category: Optional[str] = None,
    author: Optional[str] = None,
    language: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
) -> List[BookRead]:
    """
    Retrieve a list of books with optional filtering.
    
    Args:
        category: Filter books by category name
        author: Filter books by author name
        language: Filter books by language code
        session: Database session dependency
        
    Returns:
        List of books matching the criteria
    """
    books = await books_service.list_books(session, category=category, author=author, language=language)
    return [BookRead.from_model(b) for b in books]


@router.get("/{book_id}", response_model=BookRead)
async def read_book(book_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> BookRead:
    """
    Retrieve a specific book by its ID.
    
    Args:
        book_id: UUID of the book to retrieve
        session: Database session dependency
        
    Returns:
        Book details
        
    Raises:
        HTTPException: 404 if book not found
    """
    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return BookRead.from_model(book)


@router.post("/create_with_file", response_model=BookRead, status_code=status.HTTP_201_CREATED)
async def create_book_with_file(
    request: Request,
    title: str = Form(...),
    author: str = Form(...),
    category: str = Form(...),
    language: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_optional_current_user),
) -> BookRead:
    if current_user is None or current_user.role not in (UserRole.ADMIN, UserRole.MODERATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges to create books")

    content_type = (file.content_type or "").lower()
    if "pdf" not in content_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be a PDF")

    # Prepare IDs and storage
    book_id = uuid.uuid4()
    upload_dir = documents_service.get_upload_dir()
    stored_name = documents_service.generate_storage_name(book_id, file.filename or "document.pdf")
    destination = upload_dir / stored_name

    written = 0
    try:
        with destination.open("wb") as buffer:
            while True:
                chunk = await file.read(_UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                written += len(chunk)
                if written > _MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Uploaded file exceeds size limit")
                buffer.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to store uploaded file") from exc
    finally:
        await file.close()

    try:
        content_text = documents_service.extract_pdf_text(destination)
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to parse PDF content") from exc

    base = str(request.base_url).rstrip("/")

    # Try to generate a thumbnail from first page; non-fatal on failure
    thumb_dir = documents_service.get_thumbnails_dir()
    thumb_filename = f"{book_id}_thumb.jpg"
    thumb_path = thumb_dir / thumb_filename
    thumbnail_url: str | None = None
    try:
        ok = documents_service.generate_pdf_thumbnail(destination, thumb_path)
        if ok:
            base = str(request.base_url).rstrip("/")
            thumbnail_url = f"{base}/uploads/thumbnails/{thumb_filename}"
    except Exception:
        thumbnail_url = None

    try:
        book = Book(
            id=book_id,
            title=title,
            author=author,
            description=description,
            category=category,
            tags=[],
            language=Language(language),
            pdf_url=f"{base}/uploads/{stored_name}",
            thumbnail_path=thumbnail_url,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid language")

    try:
        # Simpler, robust path: perform each DB step with its own commit so
        # we avoid nested transaction issues caused by other dependencies
        # starting transactions on the same AsyncSession.
        await categories_service.create_category(session, category, commit=True)

        # Persist the book record and commit so subsequent document creation
        # can reference a persisted Book row.
        session.add(book)
        await session.commit()
        await session.refresh(book)

        # Create document record (commits internally).
        await documents_service.create_document(
            session,
            book=book,
            filename=stored_name,
            content_text=content_text,
            commit=True,
        )
    except Exception:
        destination.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise

    await session.refresh(book)
    return BookRead.from_model(book)


@router.put("/{book_id}", response_model=BookRead)
async def update_book(
    book_id: uuid.UUID,
    payload: BookUpdate,
    session: AsyncSession = Depends(get_session),
    admin: object = Depends(require_admin_user),
) -> BookRead:
    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    async with session.begin():
        if payload.category:
            await categories_service.create_category(session, payload.category, commit=False)
        updated = await books_service.update_book(session, book, payload, commit=False)
    await session.refresh(updated)
    return BookRead.from_model(updated)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_book(book_id: uuid.UUID, session: AsyncSession = Depends(get_session), admin: object = Depends(require_admin_user)) -> Response:
    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    await books_service.delete_book(session, book)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{book_id}/stream-token", response_model=DocumentStreamToken)
async def issue_stream_token(
    book_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
) -> DocumentStreamToken:
    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    document = await documents_service.get_primary_document(session, book_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No document available for this book")
    token, expires_at = documents_service.create_stream_token(book_id, current_user.id)
    return DocumentStreamToken(
        token=token,
        expires_at=expires_at,
        stream_endpoint=f"/books/{book_id}/stream",
        ttl_seconds=settings.document_stream_token_ttl_seconds,
    )


@router.get("/{book_id}/stream")
async def stream_book_document(
    book_id: uuid.UUID,
    token: str = Query(..., min_length=10),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    book = await books_service.get_book(session, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    try:
        documents_service.verify_stream_token(token, expected_book_id=book_id)
    except TokenDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    # Check if book has Cloudinary storage
    if book.cloudinary_public_id:
        # Stream from Cloudinary
        from ..services import cloudinary_service
        import httpx
        
        cloudinary_url = cloudinary_service.get_pdf_url(book.cloudinary_public_id)
        
        async def _iter_cloudinary() -> AsyncIterator[bytes]:
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", cloudinary_url) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes(chunk_size=_UPLOAD_CHUNK_SIZE):
                        yield chunk
        
        return StreamingResponse(_iter_cloudinary(), media_type="application/pdf")
    
    # Fallback to local storage (for legacy books)
    document = await documents_service.get_primary_document(session, book_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No document available")

    try:
        path = documents_service.resolve_document_path(document.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document path invalid") from exc

    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found on storage")

    def _iter_file() -> Iterator[bytes]:
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(_UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(_iter_file(), media_type="application/pdf")
