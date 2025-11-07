from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def app():
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
    # Cloudinary required settings for app startup; use dummy values in tests
    os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "dummy")
    os.environ.setdefault("CLOUDINARY_API_KEY", "dummy")
    os.environ.setdefault("CLOUDINARY_API_SECRET", "dummy")

    # Import application modules after environment is configured
    from backend.models.base import Base

    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
        class_=AsyncSession,
    )

    from backend.main import create_app
    from backend.database import get_session
    application = create_app()

    async def _get_test_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    application.dependency_overrides[get_session] = _get_test_session

    try:
        yield application
    finally:
        application.dependency_overrides.clear()
        await engine.dispose()


@pytest_asyncio.fixture()
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
