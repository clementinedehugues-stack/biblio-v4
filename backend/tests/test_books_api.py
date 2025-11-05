from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from backend.models.book import Language


@pytest.mark.asyncio
async def test_admin_can_manage_books(client: AsyncClient) -> None:
    admin_payload = {
        "username": "admin",
        "password": "SuperSecret123",
        "full_name": "Admin",
        "role": "admin",
    }

    create_response = await client.post("/auth/create", json=admin_payload)
    assert create_response.status_code == 201

    login_response = await client.post(
        "/auth/login",
    json={"username": admin_payload["username"], "password": admin_payload["password"]},
    )
    assert login_response.status_code == 200
    admin_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    book_payload = {
        "title": "Test Driven Development",
        "author": "Kent Beck",
        "description": "A classic software engineering title.",
        "cover_image_url": "https://example.com/cover.png",
        "category": "software",
        "tags": ["tdd", "agile"],
        "language": Language.EN.value,
    }

    create_book = await client.post("/books/", json=book_payload, headers=headers)
    assert create_book.status_code == 201
    created_book = create_book.json()
    book_id = uuid.UUID(created_book["id"])

    list_response = await client.get("/books/")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    detail_response = await client.get(f"/books/{book_id}")
    assert detail_response.status_code == 200
    book_data = detail_response.json()
    assert book_data["title"] == book_payload["title"]
    assert book_data["has_document"] is False
    assert book_data["stream_endpoint"] is None

    update_response = await client.put(
        f"/books/{book_id}",
        json={"title": "Refactoring"},
        headers=headers,
    )
    assert update_response.status_code == 200, update_response.json()
    assert update_response.json()["title"] == "Refactoring"

    delete_response = await client.delete(f"/books/{book_id}", headers=headers)
    assert delete_response.status_code == 204

    missing_response = await client.get(f"/books/{book_id}")
    assert missing_response.status_code == 404


@pytest.mark.asyncio
async def test_non_admin_cannot_create_books(client: AsyncClient) -> None:
    admin_payload = {
        "username": "root",
        "password": "RootSecret123",
        "full_name": "Root",
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

    user_payload = {
        "username": "reader",
        "password": "UserSecret123",
        "full_name": "User",
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

    book_payload = {
        "title": "Unauthorized",
        "author": "No Rights",
        "description": "Should not pass.",
        "cover_image_url": "https://example.com/cover2.png",
        "category": "restricted",
        "tags": ["forbidden"],
        "language": Language.FR.value,
    }

    response = await client.post("/books/", json=book_payload, headers=user_headers)
    assert response.status_code == 403

    missing_auth_response = await client.post("/books/", json=book_payload)
    assert missing_auth_response.status_code == 403
