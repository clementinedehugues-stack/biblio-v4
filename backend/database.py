"""Database session handling utilities."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .core.config import settings


engine = create_async_engine(settings.database_url, echo=False, future=True)

async_session_factory = async_sessionmaker(
	bind=engine,
	autoflush=False,
	autocommit=False,
	expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
	"""Yield a database session for request-scoped usage."""

	async with async_session_factory() as session:
		yield session
