"""
FastAPI application factory and configuration.

This module creates and configures the main FastAPI application with:
- CORS middleware configuration
- API route registration
- Cloudinary integration for file storage
"""

from __future__ import annotations

import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    # Always ensure our known frontend origin is present
    default_frontend = os.getenv("FRONTEND_ORIGIN", "https://bibliotheque-2u2m.onrender.com").strip()
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
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            default_frontend,
        ]

    # Optionally allow regex
    origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX")

    # Union with default_frontend to avoid misconfig from env
    if default_frontend and default_frontend not in origins:
        origins.append(default_frontend)

    # De-duplicate while preserving order and drop empties
    origins = sorted(list(set(o for o in origins if o)))

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

    # NOTE: All thumbnails are now served from Cloudinary CDN.
    # Legacy StaticFiles mount for /uploads/thumbnails has been removed.
    # New uploads automatically use Cloudinary URLs (see routes/documents.py).
    
    return application


app = create_app()

# Optional diagnostic route
@app.get("/ping")
def ping():
    return {"message": "pong", "CORS": getattr(app.state, "allowed_origins", [])}
