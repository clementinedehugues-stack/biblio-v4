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
from fastapi import FastAPI, Response, Request
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
    origins = [o for o in dict.fromkeys(origins) if o]

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
    
    @application.middleware("http")
    async def ensure_cors_headers(request: Request, call_next):
        """
        Safety-net CORS middleware:
        - Guarantees Access-Control-Allow-* headers even if upstream/proxy swallows preflight
        - Handles bare OPTIONS with a 204 when routed before CORSMiddleware
        """
        origin = request.headers.get("origin", "")
        is_allowed = origin and (origin in application.state.allowed_origins)

        # Preflight short-circuit (in case proxy doesn't pass through to CORSMiddleware)
        if request.method == "OPTIONS":
            resp = Response(status_code=204)
            if is_allowed:
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Vary"] = "Origin"
                resp.headers["Access-Control-Allow-Credentials"] = "true"
            # Echo requested headers/methods when present
            req_headers = request.headers.get("access-control-request-headers")
            req_method = request.headers.get("access-control-request-method")
            resp.headers["Access-Control-Allow-Headers"] = req_headers or "*"
            resp.headers["Access-Control-Allow-Methods"] = req_method or "*"
            return resp

        response = await call_next(request)
        if is_allowed:
            # Add ACAO if missing
            if "access-control-allow-origin" not in {k.lower(): v for k, v in response.headers.items()}:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Vary"] = "Origin"
                response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
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
