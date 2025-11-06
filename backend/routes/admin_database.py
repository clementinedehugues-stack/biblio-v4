"""
API endpoint to reset the database (admin only).
Deletes all books, documents, categories, and comments.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import require_admin_user
from ..models.book import Book
from ..models.document import Document
from ..models.category import Category
from ..models.comment import Comment

router = APIRouter(prefix="/admin/database", tags=["admin", "database"])


@router.post("/reset")
async def reset_database(
    session: AsyncSession = Depends(get_session),
    admin: object = Depends(require_admin_user),
) -> dict:
    """
    Delete all books, documents, categories, and comments.
    
    This endpoint requires admin authentication.
    Use this to prepare for a fresh start with Cloudinary-only storage.
    
    Returns:
        Dictionary with deletion counts for each entity type
    """
    
    async with session.begin():
        # Delete comments first (foreign key to books)
        result = await session.execute(delete(Comment))
        comments_deleted = result.rowcount
        
        # Delete documents (foreign key to books)
        result = await session.execute(delete(Document))
        documents_deleted = result.rowcount
        
        # Delete books
        result = await session.execute(delete(Book))
        books_deleted = result.rowcount
        
        # Delete categories
        result = await session.execute(delete(Category))
        categories_deleted = result.rowcount
    
    await session.commit()
    
    return {
        "message": "Database reset successful",
        "deleted": {
            "books": books_deleted,
            "documents": documents_deleted,
            "categories": categories_deleted,
            "comments": comments_deleted,
        },
        "total": books_deleted + documents_deleted + categories_deleted + comments_deleted,
    }
