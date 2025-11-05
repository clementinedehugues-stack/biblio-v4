# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning where applicable.

## [v1.0-stable] - 2025-10-25

### Added
- Backend FastAPI with JWT authentication (admin/moderator/user roles).
- Core domain models: User, Book, Document, Category, Comment with Alembic migrations.
- API endpoints for auth (`/auth/login`, `/auth/create`, `/auth/me`), books (CRUD, stream-token, stream), documents (upload, search, regenerate_thumbnails), categories (list/CRUD), comments.
- File upload pipeline with safe filenames, optional thumbnail generation, and text extraction for search.
- Docs: Project Context (`project_context.md`), API Reference (`docs/API_REFERENCE.md`), backend README, root README, scripts README.
- Frontend React + Vite + Tailwind scaffold with routing, i18n setup (FR/EN) groundwork, and admin pages skeleton.
- Automation scripts to start/stop services and verify network access.

### Quality
- 36 backend tests passing (100% pass rate); overall coverage ~50% (services ~71%).
- Lint baseline is clean for backend tests; frontend includes ESLint config and scripts.

### Changed
- Consolidated documentation structure and cross-links between root README, backend README, and API docs.
- Archived legacy backend notes into `backend/README_OLD.md` (kept for reference).

### Known gaps (to monitor)
- Incomplete coverage for services `documents.py` (~45%) and `categories.py` (~21%).
- Routes coverage around books/documents are limited (~24–35% in areas).
- E2E and performance tests not yet present.

### Upgrade notes
- Ensure Poppler is installed if enabling thumbnail generation for PDFs.
- Configure `DATABASE_URL`, `JWT_SECRET_KEY`, and `UPLOAD_DIR` per environment.

### Release management
- Tag to create: `v1.0-stable` (no git repo detected in workspace; see commands below).

### Optional commands to create tag (run at repo root)
```bash
# Initialize git if needed (optional)
# git init && git add . && git commit -m "chore: initial commit for v1.0-stable"

# Create and push tag
# git tag v1.0-stable
# git push origin v1.0-stable
```

