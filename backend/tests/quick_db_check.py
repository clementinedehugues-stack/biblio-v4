"""Utility script to verify database connectivity."""

from __future__ import annotations

import asyncio

from sqlalchemy import text

from backend.database import engine


async def main() -> None:
	async with engine.begin() as conn:
		result = await conn.execute(text("SELECT 1"))
		version = await conn.execute(text("SHOW server_version"))
		print("SELECT 1 =", result.scalar())
		print("server_version =", version.scalar())


if __name__ == "__main__":
	asyncio.run(main())
