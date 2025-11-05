"""One-off maintenance script to rewrite book thumbnail_path base URL.

Usage:
  - Ensure the backend environment is configured (DATABASE_URL, etc.)
  - Set PUBLIC_API_BASE_URL to the desired public base (e.g. http://192.168.1.42:8000)
  - Run with: uv run python -m backend.scripts.fix_public_urls  (or python -m ... inside the backend venv)

This updates absolute URLs like http://localhost:8000/uploads/... to the configured base.
"""
from __future__ import annotations

import asyncio
import os
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session_factory
from ..models.book import Book


def _env_base() -> str:
    base = os.getenv("PUBLIC_API_BASE_URL", "").strip()
    if not base:
        raise SystemExit("PUBLIC_API_BASE_URL is required for this script (e.g., http://192.168.1.42:8000)")
    return base.rstrip("/")


async def main() -> None:
    base = _env_base()
    changed = 0
    total = 0

    async with async_session_factory() as session:
        result = await session.execute(select(Book))
        books = list(result.scalars())
        for b in books:
            total += 1
            dirty = False
            if b.thumbnail_path:
                p = urlparse(b.thumbnail_path)
                if p.path:
                    new_url = f"{base}{p.path}"
                    if new_url != b.thumbnail_path:
                        b.thumbnail_path = new_url
                        dirty = True
            if dirty:
                session.add(b)
                changed += 1
        if changed:
            await session.commit()

    print(f"Processed {total} books, updated {changed}.")


if __name__ == "__main__":
    asyncio.run(main())
