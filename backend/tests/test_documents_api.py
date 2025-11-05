from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

from backend.services import documents as documents_service
from backend.models.book import Language

DUMMY_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 50 150 Td (Hello PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000106 00000 n \n0000000175 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n244\n%%EOF\n"


@pytest.mark.asyncio
async def test_admin_uploads_pdf_and_content_indexed(client: AsyncClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))

    extracted_text = "Ancient library scrolls"
    monkeypatch.setattr(documents_service, "extract_pdf_text", lambda path: extracted_text)

    admin_payload = {
        "username": "doc_admin",
        "password": "AdminPass123",
        "full_name": "Doc Admin",
        "role": "admin",
    }
    create_admin = await client.post("/auth/create", json=admin_payload)
    assert create_admin.status_code == 201

    login = await client.post("/auth/login", json={"username": admin_payload["username"], "password": admin_payload["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    book_payload = {
        "title": "The Archivist",
        "author": "A. Keeper",
        "description": "A tale about ancient archives.",
        "cover_image_url": "https://example.com/archivist.png",
        "category": "history",
        "tags": ["archive", "library"],
        "language": Language.EN.value,
    }
    create_book = await client.post("/books/", json=book_payload, headers=headers)
    assert create_book.status_code == 201
    book_id = uuid.UUID(create_book.json()["id"])

    files = {"file": ("archive.pdf", DUMMY_PDF_BYTES, "application/pdf")}
    data = {"book_id": str(book_id)}
    upload_response = await client.post("/documents/upload", data=data, files=files, headers=headers)
    assert upload_response.status_code == 201, upload_response.json()
    payload = upload_response.json()
    assert payload["book_id"] == str(book_id)

    stored_files = list((tmp_path / "uploads").iterdir())
    assert len(stored_files) == 1

    detail_response = await client.get(f"/books/{book_id}")
    assert detail_response.status_code == 200
    book_data = detail_response.json()
    assert book_data["has_document"] is True
    assert book_data["stream_endpoint"].endswith(f"/books/{book_id}/stream")

    token_response = await client.post(f"/books/{book_id}/stream-token", headers=headers)
    assert token_response.status_code == 200
    token_payload = token_response.json()
    stream_url = token_payload["stream_endpoint"]
    token_value = token_payload["token"]

    stream_response = await client.get(f"{stream_url}?token={token_value}")
    assert stream_response.status_code == 200
    streamed_bytes = stream_response.content
    assert streamed_bytes == DUMMY_PDF_BYTES

    search_response = await client.get("/documents/search", params={"query": "library"})
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) == 1
    assert results[0]["id"] == str(book_id)


@pytest.mark.asyncio
async def test_non_admin_cannot_upload_pdf(client: AsyncClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setattr(documents_service, "extract_pdf_text", lambda path: "Should not matter")

    admin_payload = {
        "username": "uploader_admin",
        "password": "UploaderPass123",
        "full_name": "Uploader Admin",
        "role": "admin",
    }
    create_admin = await client.post("/auth/create", json=admin_payload)
    assert create_admin.status_code == 201

    admin_login = await client.post(
        "/auth/login",
    json={"username": admin_payload["username"], "password": admin_payload["password"]},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    book_payload = {
        "title": "Restricted Archives",
        "author": "G. Keeper",
        "description": "Only admins may upload documents.",
        "cover_image_url": "https://example.com/restricted.png",
        "category": "policy",
        "tags": ["security"],
        "language": Language.FR.value,
    }
    book_response = await client.post("/books/", json=book_payload, headers=admin_headers)
    assert book_response.status_code == 201
    book_id = book_response.json()["id"]

    user_payload = {
        "username": "standard_user",
        "password": "StandardPass123",
        "full_name": "Standard User",
        "role": "user",
    }
    create_user = await client.post("/auth/create", json=user_payload, headers=admin_headers)
    assert create_user.status_code == 201

    user_login = await client.post(
        "/auth/login",
    json={"username": user_payload["username"], "password": user_payload["password"]},
    )
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    files = {"file": ("restricted.pdf", DUMMY_PDF_BYTES, "application/pdf")}
    data = {"book_id": book_id}
    upload_attempt = await client.post("/documents/upload", data=data, files=files, headers=user_headers)
    assert upload_attempt.status_code == 403