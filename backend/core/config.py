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
	if raw_db_url.startswith("postgresql://") and "+asyncpg" not in raw_db_url:
		raw_db_url = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

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
