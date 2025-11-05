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
import json
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

    # CORS configuration
    # 1) Try reading Render env CORS_ALLOW_ORIGINS as JSON (e.g., ["http://...","..."])
    # 2) Fallback to defaults for local dev and the hosted frontend
    cors_env = os.getenv("CORS_ALLOW_ORIGINS")
    if cors_env:
        try:
            parsed = json.loads(cors_env)
            if isinstance(parsed, list):
                origins = [str(o).strip() for o in parsed if str(o).strip()]
            else:
                # If it's a single string or another type, use as a single origin
                origins = [str(parsed).strip()]
        except json.JSONDecodeError:
            # Accept comma-separated values as a convenience fallback
            if "," in cors_env:
                origins = [o.strip() for o in cors_env.split(",") if o.strip()]
            else:
                origins = [cors_env.strip()]
    else:
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://biblio-frontend.onrender.com",
        ]

    # Optionally allow regex
    origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX")

    # De-duplicate while preserving order
    origins = list(dict.fromkeys(origins))

    # Console log to help verify CORS config at startup
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
    # Expose allowed origins for diagnostics routes
    application.state.allowed_origins = origins
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

# Optional diagnostic route
@app.get("/ping")
def ping():
    return {"message": "pong", "CORS": getattr(app.state, "allowed_origins", [])}
