"""Book service layer for business logic and database operations."""

from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from ..models.book import Book
from ..schemas.book import BookCreate, BookUpdate


def _schema_to_data(schema_obj, *, exclude_unset: bool = False) -> dict:
    """
    Convert Pydantic schema to dictionary compatible with SQLAlchemy models.
    
    Handles both Pydantic v1 and v2 compatibility.
    
    Args:
        schema_obj: Pydantic schema instance
        exclude_unset: Whether to exclude unset fields
        
    Returns:
        Dictionary representation of schema
    """
    if hasattr(schema_obj, "model_dump"):
        return schema_obj.model_dump(exclude_unset=exclude_unset, mode="json")
    return schema_obj.dict(exclude_unset=exclude_unset)


async def list_books(
    session: AsyncSession,
    *,
    category: Optional[str] = None,
    author: Optional[str] = None,
    language: Optional[str] = None,
) -> List[Book]:
    """
    Retrieve books with optional filtering.
    
    Args:
        session: Database session
        category: Optional category filter
        author: Optional author filter  
        language: Optional language filter
        
    Returns:
        List of books matching criteria
    """
    q = select(Book)
    if category:
        q = q.where(Book.category == category)
    if author:
        q = q.where(Book.author == author)
    if language:
        q = q.where(Book.language == language)
    result = await session.execute(q)
    return result.scalars().all()


async def get_book(session: AsyncSession, book_id: uuid.UUID) -> Optional[Book]:
    """
    Retrieve a book by ID.
    
    Args:
        session: Database session
        book_id: Book UUID
        
    Returns:
        Book instance or None if not found
    """
    result = await session.execute(select(Book).where(Book.id == book_id))
    return result.scalar_one_or_none()


async def create_book(session: AsyncSession, data: BookCreate, *, commit: bool = True) -> Book:
    book = Book(**_schema_to_data(data))
    session.add(book)
    if commit:
        await session.commit()
        await session.refresh(book)
    else:
        await session.flush()
    return book


async def update_book(session: AsyncSession, book: Book, data: BookUpdate, *, commit: bool = True) -> Book:
    for field, value in _schema_to_data(data, exclude_unset=True).items():
        setattr(book, field, value)
    session.add(book)
    if commit:
        await session.commit()
        await session.refresh(book)
    else:
        await session.flush()
    return book


async def delete_book(session: AsyncSession, book: Book) -> None:
    await session.delete(book)
    await session.commit()
