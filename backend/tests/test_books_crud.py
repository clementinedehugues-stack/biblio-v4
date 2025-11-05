"""Unit tests for books CRUD and filtering."""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from backend.models.user import UserRole


@pytest.fixture
async def admin_token(client: AsyncClient) -> str:
    """Create an admin user and return their auth token."""
    await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "admin_pass_12345",
            "full_name": "Admin User",
            "role": "admin",
        },
    )
    response = await client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin_pass_12345"},
    )
    return response.json()["access_token"]


@pytest.fixture
async def user_token(client: AsyncClient) -> str:
    """Create a regular user and return their auth token."""
    # First create admin to allow user creation
    await client.post(
        "/auth/create",
        json={
            "username": "admin1",
            "password": "admin_pass_12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )
    admin_login = await client.post(
        "/auth/login",
        json={"username": "admin1", "password": "admin_pass_12345"},
    )
    admin_token = admin_login.json()["access_token"]

    # Create user
    await client.post(
        "/auth/create",
        json={
            "username": "user1",
            "password": "user_pass_123456",
            "full_name": "User",
            "role": "user",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    login_resp = await client.post(
        "/auth/login",
        json={"username": "user1", "password": "user_pass_123456"},
    )
    return login_resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_book_as_admin(client: AsyncClient, admin_token: str):
    """Test creating a book as admin."""
    response = await client.post(
        "/books/",
        json={
            "title": "Python Guide",
            "author": "John Doe",
            "isbn": "9781234567890",
            "category": "Programming",
            "language": "en",
            "description": "A comprehensive guide to Python",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Python Guide"
    assert data["author"] == "John Doe"
    assert data["category"] == "Programming"
    assert data["language"] == "en"


@pytest.mark.asyncio
async def test_create_book_requires_privilege(client: AsyncClient, user_token: str):
    """Test that non-admins cannot create books."""
    response = await client.post(
        "/books/",
        json={
            "title": "Test Book",
            "author": "Test Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Test",
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
    assert "Insufficient privileges" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_book_without_auth(client: AsyncClient):
    """Test that anonymous users cannot create books."""
    response = await client.post(
        "/books/",
        json={
            "title": "Test Book",
            "author": "Test Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Test",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_books_empty(client: AsyncClient):
    """Test listing books when none exist."""
    response = await client.get("/books/")
    assert response.status_code == 200
    data = response.json()
    assert data == []


@pytest.mark.asyncio
async def test_list_books_with_data(client: AsyncClient, admin_token: str):
    """Test listing books with data."""
    # Create multiple books
    books_data = [
        {
            "title": "Python 101",
            "author": "Author A",
            "isbn": "9781111111111",
            "category": "Programming",
            "language": "en",
            "description": "Python basics",
        },
        {
            "title": "JavaScript Guide",
            "author": "Author B",
            "isbn": "9782222222222",
            "category": "Programming",
            "language": "en",
            "description": "JavaScript guide",
        },
        {
            "title": "French Novel",
            "author": "Author C",
            "isbn": "9783333333333",
            "category": "Fiction",
            "language": "fr",
            "description": "A French novel",
        },
    ]

    for book_data in books_data:
        await client.post(
            "/books/",
            json=book_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    response = await client.get("/books/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


@pytest.mark.asyncio
async def test_get_book_by_id(client: AsyncClient, admin_token: str):
    """Test retrieving a book by ID."""
    # Create a book
    create_resp = await client.post(
        "/books/",
        json={
            "title": "Test Book",
            "author": "Test Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    book_id = create_resp.json()["id"]

    # Retrieve it
    response = await client.get(f"/books/{book_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Book"


@pytest.mark.asyncio
async def test_get_nonexistent_book(client: AsyncClient):
    """Test retrieving a book that doesn't exist."""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/books/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_filter_books_by_category(client: AsyncClient, admin_token: str):
    """Test filtering books by category."""
    # Create books with different categories
    await client.post(
        "/books/",
        json={
            "title": "Python Book",
            "author": "Author A",
            "isbn": "9781111111111",
            "category": "Programming",
            "language": "en",
            "description": "Python",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    await client.post(
        "/books/",
        json={
            "title": "Novel",
            "author": "Author B",
            "isbn": "9782222222222",
            "category": "Fiction",
            "language": "en",
            "description": "Fiction",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Filter by category
    response = await client.get("/books/?category=Programming")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Python Book"


@pytest.mark.asyncio
async def test_filter_books_by_author(client: AsyncClient, admin_token: str):
    """Test filtering books by author."""
    await client.post(
        "/books/",
        json={
            "title": "Book 1",
            "author": "Stephen King",
            "isbn": "9781111111111",
            "category": "Fiction",
            "language": "en",
            "description": "Book 1",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    await client.post(
        "/books/",
        json={
            "title": "Book 2",
            "author": "Stephen King",
            "isbn": "9782222222222",
            "category": "Fiction",
            "language": "en",
            "description": "Book 2",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Filter by author
    response = await client.get("/books/?author=Stephen%20King")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_filter_books_by_language(client: AsyncClient, admin_token: str):
    """Test filtering books by language."""
    await client.post(
        "/books/",
        json={
            "title": "English Book",
            "author": "Author A",
            "isbn": "9781111111111",
            "category": "Fiction",
            "language": "en",
            "description": "English",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    await client.post(
        "/books/",
        json={
            "title": "French Book",
            "author": "Author B",
            "isbn": "9782222222222",
            "category": "Fiction",
            "language": "fr",
            "description": "French",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Filter by language
    response = await client.get("/books/?language=fr")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "French Book"


@pytest.mark.asyncio
async def test_update_book_as_admin(client: AsyncClient, admin_token: str):
    """Test updating a book as admin."""
    # Create a book
    create_resp = await client.post(
        "/books/",
        json={
            "title": "Original Title",
            "author": "Original Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Original",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    book_id = create_resp.json()["id"]

    # Update it
    response = await client.put(
        f"/books/{book_id}",
        json={
            "title": "Updated Title",
            "author": "Updated Author",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["author"] == "Updated Author"


@pytest.mark.asyncio
async def test_delete_book_as_admin(client: AsyncClient, admin_token: str):
    """Test deleting a book as admin."""
    # Create a book
    create_resp = await client.post(
        "/books/",
        json={
            "title": "To Delete",
            "author": "Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Delete me",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    book_id = create_resp.json()["id"]

    # Delete it
    response = await client.delete(
        f"/books/{book_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204

    # Verify it's gone
    response = await client.get(f"/books/{book_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_book_requires_admin(client: AsyncClient, admin_token: str, user_token: str):
    """Test that only admins can delete books."""
    # Create a book
    create_resp = await client.post(
        "/books/",
        json={
            "title": "Book",
            "author": "Author",
            "isbn": "9781234567890",
            "category": "Test",
            "language": "en",
            "description": "Test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    book_id = create_resp.json()["id"]

    # Try to delete as regular user
    response = await client.delete(
        f"/books/{book_id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
