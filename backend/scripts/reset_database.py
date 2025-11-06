"""
Script to reset the database by deleting all books, documents, and categories.
This prepares the system for a fresh start with Cloudinary-only storage.

Usage:
    python -m backend.scripts.reset_database
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_session, engine
from backend.models.book import Book
from backend.models.document import Document
from backend.models.category import Category
from backend.models.comment import Comment


async def reset_database():
    """Delete all books, documents, categories, and comments from the database."""
    
    print("🗑️  Starting database reset...")
    print("⚠️  This will delete ALL books, documents, categories, and comments!")
    print()
    
    async with AsyncSession(engine) as session:
        async with session.begin():
            # Delete comments first (foreign key to books)
            print("📝 Deleting all comments...")
            result = await session.execute(delete(Comment))
            comments_deleted = result.rowcount
            print(f"   ✅ Deleted {comments_deleted} comments")
            
            # Delete documents (foreign key to books)
            print("📄 Deleting all documents...")
            result = await session.execute(delete(Document))
            documents_deleted = result.rowcount
            print(f"   ✅ Deleted {documents_deleted} documents")
            
            # Delete books
            print("📚 Deleting all books...")
            result = await session.execute(delete(Book))
            books_deleted = result.rowcount
            print(f"   ✅ Deleted {books_deleted} books")
            
            # Delete categories
            print("🏷️  Deleting all categories...")
            result = await session.execute(delete(Category))
            categories_deleted = result.rowcount
            print(f"   ✅ Deleted {categories_deleted} categories")
            
        await session.commit()
    
    print()
    print("✨ Database reset complete!")
    print(f"   Total deleted: {books_deleted} books, {documents_deleted} documents, {categories_deleted} categories, {comments_deleted} comments")
    print()
    print("🎉 Ready for fresh uploads with Cloudinary!")
    print()


async def main():
    """Main entry point."""
    try:
        await reset_database()
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
