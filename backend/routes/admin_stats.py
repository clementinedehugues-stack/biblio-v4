"""Administrative endpoints for dashboard statistics and analytics."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.book import Book
from ..models.user import User
from ..models.document import Document
from ..models.category import Category
from ..schemas.admin_stats import TopBooksResponse, ActiveUsersResponse, RecentReportsResponse, CountsResponse

router = APIRouter(prefix="/admin/stats", tags=["admin-stats"])


@router.get("/top-books", response_model=TopBooksResponse)
async def get_top_books(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> TopBooksResponse:
    """Get statistics for top books by document count."""

    # Get books with their document count
    result = await session.execute(
        select(Book.title, func.count(Document.id).label("doc_count"))
        .join(Document, Book.id == Document.book_id)
        .group_by(Book.id, Book.title)
        .order_by(desc("doc_count"))
        .limit(10)
    )

    books_data = result.all()

    return TopBooksResponse(
        labels=[book.title for book in books_data],
        data=[book.doc_count for book in books_data]
    )


@router.get("/active-users", response_model=ActiveUsersResponse)
async def get_active_users(
    days: int = 30,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> ActiveUsersResponse:
    """Get user registration count over the last N days."""

    # Get user registration counts per day for the last N days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Generate date range
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.date())
        current_date += timedelta(days=1)

    # Query user counts per day
    result = await session.execute(
        select(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count")
        )
        .where(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )

    daily_counts = {row.date: row.count for row in result.all()}

    # Fill in missing dates with 0
    labels = [date.strftime("%Y-%m-%d") for date in dates]
    data = [daily_counts.get(date, 0) for date in dates]

    return ActiveUsersResponse(
        labels=labels,
        data=data
    )


@router.get("/recent-reports", response_model=RecentReportsResponse)
async def get_recent_reports(
    limit: int = 10,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> RecentReportsResponse:
    """Get recent reports/issues (placeholder for future implementation)."""

    # For now, return empty list since we don't have a reports system
    # In a real app, you'd have a reports/issues table
    return RecentReportsResponse(reports=[])


@router.get("/counts", response_model=CountsResponse)
async def get_counts(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> CountsResponse:
    """Return aggregated counts for users, books and categories.

    This allows the frontend to fetch summary stats in a single request.
    """

    users_count_result = await session.execute(select(func.count(User.id)))
    users_count = int(users_count_result.scalar() or 0)

    books_count_result = await session.execute(select(func.count(Book.id)))
    books_count = int(books_count_result.scalar() or 0)

    categories_count_result = await session.execute(select(func.count(Category.name)))
    categories_count = int(categories_count_result.scalar() or 0)

    return CountsResponse(
        users=users_count,
        books=books_count,
        categories=categories_count,
    )