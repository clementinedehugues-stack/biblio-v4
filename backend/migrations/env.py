from __future__ import annotations

import sys
import ssl
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.append(str(WORKSPACE_ROOT))

from backend.core.config import settings, _mask_dsn  # noqa: E402
from backend.models import Base  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ➤ Use DB URL directly (asyncpg must NOT have ssl params in the URL)
DATABASE_URL = settings.database_url.split("?")[0]  # Remove query params entirely

config.set_main_option("sqlalchemy.url", DATABASE_URL)
print("[Alembic] Using database URL:", _mask_dsn(DATABASE_URL))

target_metadata = Base.metadata


def _strip_async_driver(url: str) -> str:
    """Remove async driver suffix for offline migrations."""
    if url.startswith("postgresql+asyncpg"):
        return url.replace("+asyncpg", "", 1)
    return url


def run_migrations_offline() -> None:
    url = _strip_async_driver(DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    # SSL context required for Neon
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    engine = create_async_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
        connect_args={"ssl": ssl_context},
    )

    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())
