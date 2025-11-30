"""Application configuration helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
	"""Central configuration values for the backend."""

	database_url: str
	jwt_secret_key: str
	jwt_algorithm: str
	access_token_expire_minutes: int
	document_stream_token_ttl_seconds: int
	cloudinary_cloud_name: str
	cloudinary_api_key: str
	cloudinary_api_secret: str


def _load_settings() -> Settings:
	"""Load settings from environment variables with sensible defaults."""

	raw_db_url = os.getenv(
		"DATABASE_URL",
		"postgresql+asyncpg://postgres:postgres@localhost:5432/biblio",
	)
	# Sanitize common copy/paste mistakes (e.g. setting env var to: psql 'postgresql://...')
	raw_db_url = raw_db_url.strip()
	if raw_db_url.startswith("psql "):
		# Remove leading CLI command part
		raw_db_url = raw_db_url[5:].strip()
	# Strip surrounding single or double quotes if present
	if (raw_db_url.startswith("'") and raw_db_url.endswith("'")) or (
		raw_db_url.startswith('"') and raw_db_url.endswith('"')
	):
		raw_db_url = raw_db_url[1:-1].strip()
	if raw_db_url.startswith("postgresql://") and "+asyncpg" not in raw_db_url:
		raw_db_url = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

	# If using asyncpg, map sslmode=require to asyncpg-compatible parameter
	if "+asyncpg://" in raw_db_url:
		# Split URL to manipulate query params safely
		try:
			base, _, query = raw_db_url.partition("?")
			if query:
				parts = []
				ssl_present = False
				for kv in query.split("&"):
					k, _, v = kv.partition("=")
					if k == "sslmode":
						# asyncpg doesn't accept sslmode; translate require -> ssl=true
						ssl_present = True
						continue  # drop sslmode from query
					parts.append(kv)
				if ssl_present:
					parts.append("ssl=true")
				new_query = "&".join(p for p in parts if p)
				raw_db_url = base + ("?" + new_query if new_query else "")
		except Exception:
			# If anything goes wrong, leave raw_db_url as-is; asyncpg often defaults to SSL on Neon
			pass

	secret = os.getenv("JWT_SECRET_KEY")
	if not secret:
		raise RuntimeError("JWT_SECRET_KEY must be set")

	cloudinary_cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
	cloudinary_api_key = os.getenv("CLOUDINARY_API_KEY")
	cloudinary_api_secret = os.getenv("CLOUDINARY_API_SECRET")
	
	if not all([cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret]):
		raise RuntimeError("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set")

	return Settings(
		database_url=raw_db_url,
		jwt_secret_key=secret,
		jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
		access_token_expire_minutes=int(
			os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24))
		),
		document_stream_token_ttl_seconds=int(
			os.getenv("DOCUMENT_STREAM_TOKEN_TTL_SECONDS", str(5 * 60))
		),
		cloudinary_cloud_name=cloudinary_cloud_name,
		cloudinary_api_key=cloudinary_api_key,
		cloudinary_api_secret=cloudinary_api_secret,
	)


@lru_cache()
def get_settings() -> Settings:
	"""Return cached settings ensuring .env is loaded once."""

	env_path = Path(__file__).resolve().parents[1] / ".env"
	load_dotenv(dotenv_path=env_path, override=False)
	return _load_settings()


settings = get_settings()
