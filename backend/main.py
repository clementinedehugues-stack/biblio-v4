"""
FastAPI application factory and configuration.

This module creates and configures the main FastAPI application with:
- CORS middleware configuration
- API route registration
- Static file serving for thumbnails
"""

from __future__ import annotations

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routes import admin_users, admin_stats, admin_logs, admin_notifications, admin_roles, admin_support, auth, books, documents, user_self, categories, comments


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Returns:
        Configured FastAPI application instance
    """
    application = FastAPI(title="Bibliotheque API", version="0.1.0")

    # CORS: default allowlist + optional extension via env.
    # Defaults include local dev and the Render-hosted frontend.
    origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://biblio-frontend.onrender.com",
    ]

    # Optional extra origins from env (comma-separated)
    extra_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if extra_origins:
        origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

    # De-duplicate while preserving order
    origins = list(dict.fromkeys(origins))

    origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX")

    # Simple console log to help verify CORS config at startup
    print("[CORS] Enabled with:")
    print(f"        allow_origins={origins}")
    if origin_regex:
        print(f"        allow_origin_regex={origin_regex}")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth.router)
    application.include_router(books.router)
    application.include_router(documents.router)
    application.include_router(admin_users.router)
    application.include_router(admin_stats.router)
    application.include_router(admin_logs.router)
    application.include_router(admin_notifications.router)
    application.include_router(admin_roles.router)
    application.include_router(admin_support.router)
    application.include_router(categories.router)
    application.include_router(comments.router)
    application.include_router(user_self.router)

    # Serve public thumbnails only. PDFs are streamed via protected endpoints.
    default_upload_dir = (Path(__file__).resolve().parents[1] / "uploads").resolve()
    upload_dir = Path(os.getenv("UPLOAD_DIR", str(default_upload_dir)))
    thumbnails_dir = upload_dir / "thumbnails"
    application.mount(
        "/uploads/thumbnails",
        StaticFiles(directory=thumbnails_dir, check_dir=False),
        name="thumbnails",
    )
    return application


app = create_app()
