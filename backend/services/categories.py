from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Category, Book


async def list_categories(session: AsyncSession) -> list[tuple[str, int]]:
    """Return (name, usage_count) for all categories."""
    # Count usage from books table; category is a plain string field
    usage_stmt = select(Book.category, func.count()).group_by(Book.category)
    usage = {row[0]: row[1] for row in (await session.execute(usage_stmt)).all()}

    stmt = select(Category)
    result = await session.execute(stmt)
    items: list[tuple[str, int]] = []
    for cat in result.scalars():
        items.append((cat.name, int(usage.get(cat.name, 0))))
    return items


async def create_category(session: AsyncSession, name: str, *, commit: bool = True) -> Category:
    cat = await session.get(Category, name)
    if cat:
        return cat
    cat = Category(name=name)
    session.add(cat)
    if commit:
        await session.commit()
        await session.refresh(cat)
    else:
        await session.flush()
    return cat


async def delete_category(session: AsyncSession, name: str) -> bool:
    cat = await session.get(Category, name)
    if not cat:
        return False
    # Only allow deletion if unused by any book
    used = await session.execute(select(func.count()).select_from(Book).where(Book.category == name))
    if int(used.scalar_one()) > 0:
        return False
    await session.delete(cat)
    await session.commit()
    return True
