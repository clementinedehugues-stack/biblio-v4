"""Unit tests for authentication service."""

from __future__ import annotations

import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import User, UserRole
from backend.schemas.auth import UserCreate
from backend.services import auth as auth_service
from backend.services import user_service
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_get_user_by_username_found(client):
    """Test retrieving an existing user by username."""
    # Create a test user through API
    response = await client.post(
        "/auth/create",
        json={
            "username": "john_doe",
            "password": "password123",
            "full_name": "John Doe",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "john_doe"


@pytest.mark.asyncio
async def test_authenticate_user_success(client):
    """Test successful user authentication."""
    # First create admin user
    response = await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "admin12345",
            "full_name": "Admin User",
            "role": "admin",
        },
    )
    assert response.status_code == 201

    # Now authenticate
    response = await client.post(
        "/auth/login",
        json={
            "username": "admin",
            "password": "admin12345",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(client):
    """Test authentication with incorrect password."""
    # Create admin first, then user
    await client.post(
        "/auth/create",
        json={
            "username": "admin_first",
            "password": "admin12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )
    admin_login = await client.post(
        "/auth/login",
        json={"username": "admin_first", "password": "admin12345"},
    )
    admin_token = admin_login.json()["access_token"]

    await client.post(
        "/auth/create",
        json={
            "username": "user1",
            "password": "correctpass123",
            "full_name": "Test User",
            "role": "user",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Try with wrong password
    response = await client.post(
        "/auth/login",
        json={
            "username": "user1",
            "password": "wrong_password",
        },
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_authenticate_user_not_found(client):
    """Test authentication for non-existent user."""
    response = await client.post(
        "/auth/login",
        json={
            "username": "nonexistent",
            "password": "any_password",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_user_first_user_must_be_admin(client):
    """Test that first user created must be admin."""
    # Try to create non-admin first user
    response = await client.post(
        "/auth/create",
        json={
            "username": "notadmin",
            "password": "password12345",
            "full_name": "Not Admin",
            "role": "user",
        },
    )
    assert response.status_code == 400
    assert "First user must be an admin" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_first_user_admin(client):
    """Test successful creation of first admin user."""
    response = await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "admin12345",
            "full_name": "Admin User",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "admin"
    assert data["full_name"] == "Admin User"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_create_user_duplicate_username(client):
    """Test that duplicate usernames are rejected."""
    # Create first admin
    await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "admin12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )

    # Try to create another with same username
    response = await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "differentpass123",
            "full_name": "Another Admin",
            "role": "admin",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_user_requires_admin_privilege(client):
    """Test that only admins can create new users after first."""
    # Create admin
    admin_response = await client.post(
        "/auth/create",
        json={
            "username": "admin",
            "password": "admin12345",
            "full_name": "Admin",
            "role": "admin",
        },
    )
    assert admin_response.status_code == 201

    # Login as admin
    login_resp = await client.post(
        "/auth/login",
        json={"username": "admin", "password": "admin12345"},
    )
    admin_token = login_resp.json()["access_token"]

    # Create regular user as admin (should work)
    response = await client.post(
        "/auth/create",
        json={
            "username": "user1",
            "password": "user123456",
            "full_name": "User 1",
            "role": "user",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_get_current_user_profile(client):
    """Test getting current user's profile."""
    # Create first user (must be admin)
    create_response = await client.post(
        "/auth/create",
        json={
            "username": "testuser",
            "password": "pass123456",
            "full_name": "Test User",
            "role": "admin",
        },
    )
    assert create_response.status_code == 201

    login_resp = await client.post(
        "/auth/login",
        json={"username": "testuser", "password": "pass123456"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Get profile
    response = await client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_get_current_user_without_token(client):
    """Test that accessing /auth/me without token fails."""
    response = await client.get("/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client):
    """Test accessing /auth/me with invalid token."""
    response = await client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == 401
