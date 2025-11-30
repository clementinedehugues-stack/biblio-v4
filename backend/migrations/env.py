from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from urllib.parse import urlsplit, urlunsplit

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = PROJECT_ROOT.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.append(str(WORKSPACE_ROOT))

from backend.core.config import settings, _mask_dsn  # noqa: E402
from backend.models import Base  # noqa: E402


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

raw_database_url = settings.database_url


def _sanitize_asyncpg_url(url: str) -> str:
    """Ensure asyncpg-compatible URL (remove sslmode/channel_binding, add ssl=true)."""
    if "+asyncpg" not in url:
        return url
    try:
        parsed = urlsplit(url)
        query = parsed.query
        parts = []
        found_sslmode = False
        has_ssl_flag = False
        if query:
            for kv in query.split("&"):
                if not kv:
                    continue
                k, _, v = kv.partition("=")
                kl = k.lower()
                if kl == "sslmode":
                    found_sslmode = True
                    continue  # drop sslmode entirely
                if kl == "channel_binding":
                    continue  # unsupported param for asyncpg
                if kl == "ssl":
                    has_ssl_flag = True
                parts.append(kv)
        if not has_ssl_flag:
            # If we removed sslmode or none provided, enforce ssl=true for Neon
            parts.append("ssl=true")
        new_query = "&".join(parts)
        return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))
    except Exception:
        return url


sanitized_database_url = _sanitize_asyncpg_url(raw_database_url)
config.set_main_option("sqlalchemy.url", sanitized_database_url)
print("[Alembic] Using (sanitized) database URL:", _mask_dsn(sanitized_database_url))

target_metadata = Base.metadata


def _strip_async_driver(url: str) -> str:
    """Remove async driver suffix for offline (synchronous) migrations."""
    if url.startswith("postgresql+asyncpg"):
        return url.replace("+asyncpg", "", 1)
    return url


def run_migrations_offline() -> None:
    url = _strip_async_driver(sanitized_database_url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    # Create engine explicitly to avoid Alembic re-parsing unsanitized URL from config.
    engine = create_async_engine(
        sanitized_database_url,
        poolclass=pool.NullPool,
        connect_args={"timeout": 30},  # optional safeguard
    )
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())
