"""Unit tests for document upload and search functionality."""

from __future__ import annotations

import io
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient

from backend.models.book import Book, Language
from backend.models.document import Document
from backend.models.user import UserRole


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    """Create an admin user and return their auth token."""
    await client.post(
        "/auth/create",
        json={
            "username": "admin_user",
            "password": "admin_pass_12345",
            "full_name": "Admin User",
            "role": "admin",
        },
    )
    response = await client.post(
        "/auth/login",
        json={"username": "admin_user", "password": "admin_pass_12345"},
    )
    return response.json()["access_token"]


@pytest.fixture
async def test_book(client: AsyncClient, admin_token: str) -> dict:
    """Create a test book."""
    response = await client.post(
        "/books/",
        json={
            "title": "Test Book",
            "author": "Test Author",
            "isbn": "9781234567890",
            "category": "Fiction",
            "language": "en",
            "description": "A test book",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    return response.json()


def create_test_pdf() -> bytes:
    """Create a minimal valid PDF file."""
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n"
        b"<< /Type /Catalog /Pages 2 0 R >>\n"
        b"endobj\n"
        b"2 0 obj\n"
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n"
        b"endobj\n"
        b"3 0 obj\n"
        b"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\n"
        b"endobj\n"
        b"4 0 obj\n"
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n"
        b"endobj\n"
        b"5 0 obj\n"
        b"<< /Length 44 >>\n"
        b"stream\n"
        b"BT /F1 12 Tf 100 700 Td (Test PDF) Tj ET\n"
        b"endstream\n"
        b"endobj\n"
        b"xref\n"
        b"0 6\n"
        b"0000000000 65535 f\n"
        b"0000000009 00000 n\n"
        b"0000000058 00000 n\n"
        b"0000000115 00000 n\n"
        b"0000000247 00000 n\n"
        b"0000000332 00000 n\n"
        b"trailer\n"
        b"<< /Size 6 /Root 1 0 R >>\n"
        b"startxref\n"
        b"425\n"
        b"%%EOF\n"
    )
    return pdf_content


@pytest.mark.asyncio
async def test_upload_pdf_success(client: AsyncClient, admin_token: str, test_book: dict):
    """Test successful PDF upload."""
    book_id = test_book["id"]
    pdf_content = create_test_pdf()

    response = await client.post(
        "/documents/upload",
        data={"book_id": book_id},
        files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["book_id"] == book_id
    assert "filename" in data


@pytest.mark.asyncio
async def test_upload_non_pdf_rejected(client: AsyncClient, admin_token: str, test_book: dict):
    """Test that non-PDF files are rejected."""
    book_id = test_book["id"]
    txt_content = b"This is not a PDF"

    response = await client.post(
        "/documents/upload",
        data={"book_id": book_id},
        files={"file": ("test.txt", io.BytesIO(txt_content), "text/plain")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "must be a PDF" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_to_nonexistent_book(client: AsyncClient, admin_token: str):
    """Test upload to a book that doesn't exist."""
    fake_book_id = str(uuid.uuid4())
    pdf_content = create_test_pdf()

    response = await client.post(
        "/documents/upload",
        data={"book_id": fake_book_id},
        files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
    assert "Book not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_requires_admin(client: AsyncClient, test_book: dict):
    """Test that only admins can upload documents."""
    # Create admin first
    await client.post(
        "/auth/create",
        json={
            "username": "admin1",
            "password": "admin12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )
    admin_login = await client.post(
        "/auth/login",
        json={"username": "admin1", "password": "admin12345"},
    )
    admin_token = admin_login.json()["access_token"]

    # Create non-admin user with admin's help
    await client.post(
        "/auth/create",
        json={
            "username": "user_user",
            "password": "user_pass1234",
            "full_name": "Regular User",
            "role": "user",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"username": "user_user", "password": "user_pass1234"},
    )
    user_token = login_resp.json()["access_token"]

    book_id = test_book["id"]
    pdf_content = create_test_pdf()

    response = await client.post(
        "/documents/upload",
        data={"book_id": book_id},
        files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_documents_admin_only(client: AsyncClient):
    """Test that list_documents is admin-only."""
    # Try without auth
    response = await client.get("/documents/")
    assert response.status_code == 403

    # Create admin first
    await client.post(
        "/auth/create",
        json={
            "username": "admin1",
            "password": "admin12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )
    admin_login = await client.post(
        "/auth/login",
        json={"username": "admin1", "password": "admin12345"},
    )
    admin_token = admin_login.json()["access_token"]

    # Create user
    await client.post(
        "/auth/create",
        json={
            "username": "user",
            "password": "pass1234567",
            "full_name": "User",
            "role": "user",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    login_resp = await client.post(
        "/auth/login",
        json={"username": "user", "password": "pass1234567"},
    )
    user_token = login_resp.json()["access_token"]

    # Try as non-admin
    response = await client.get(
        "/documents/",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_search_documents_by_content(
    client: AsyncClient, admin_token: str, test_book: dict
):
    """Test searching documents by content."""
    book_id = test_book["id"]
    pdf_content = create_test_pdf()

    # Upload document
    upload_response = await client.post(
        "/documents/upload",
        data={"book_id": book_id},
        files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert upload_response.status_code == 201

    # Search for content
    response = await client.get("/books/search?q=Test")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_empty_search_returns_empty_list(client: AsyncClient):
    """Test that searching for non-existent content returns empty list."""
    response = await client.get("/books/search?q=nonexistentcontent123456")
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_search_requires_query_parameter(client: AsyncClient):
    """Test that search endpoint requires query parameter."""
    response = await client.get("/books/search")
    assert response.status_code == 422  # Unprocessable Entity (missing required param)
