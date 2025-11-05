from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _bootstrap_admin(client: AsyncClient) -> dict[str, str]:
    admin_payload = {
        "username": "selfadmin",
        "password": "SelfAdmin123",
        "full_name": "Self Admin",
        "role": "admin",
    }
    response = await client.post("/auth/create", json=admin_payload)
    assert response.status_code == 201
    login = await client.post(
        "/auth/login",
        json={"username": admin_payload["username"], "password": admin_payload["password"]},
    )
    admin_payload["token"] = login.json()["access_token"]
    return admin_payload


async def _create_user(client: AsyncClient, headers: dict[str, str], username: str, password: str) -> dict[str, str]:
    payload = {
        "username": username,
        "password": password,
        "full_name": f"{username.title()} User",
        "role": "user",
    }
    response = await client.post("/admin/users/", json=payload, headers=headers)
    assert response.status_code == 201, response.json()
    return payload


@pytest.mark.asyncio
async def test_user_can_view_profile(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    headers = {"Authorization": f"Bearer {admin['token']}"}
    await _create_user(client, headers, username="profile_user", password="Profile123")

    login = await client.post(
        "/auth/login",
        json={"username": "profile_user", "password": "Profile123"},
    )
    token = login.json()["access_token"]

    response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "profile_user"
    assert data["role"] == "user"


@pytest.mark.asyncio
async def test_user_can_change_password(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    headers = {"Authorization": f"Bearer {admin['token']}"}
    await _create_user(client, headers, username="changer", password="OldPassword1")

    login = await client.post(
        "/auth/login",
        json={"username": "changer", "password": "OldPassword1"},
    )
    token = login.json()["access_token"]

    change_payload = {"current_password": "OldPassword1", "new_password": "NewPassword1"}
    change_resp = await client.put(
        "/users/me/password",
        json=change_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change_resp.status_code == 200

    login_new = await client.post(
        "/auth/login",
        json={"username": "changer", "password": "NewPassword1"},
    )
    assert login_new.status_code == 200


@pytest.mark.asyncio
async def test_user_change_password_with_invalid_old_password(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    headers = {"Authorization": f"Bearer {admin['token']}"}
    await _create_user(client, headers, username="wrongchanger", password="CorrectOld1")

    login = await client.post(
        "/auth/login",
        json={"username": "wrongchanger", "password": "CorrectOld1"},
    )
    token = login.json()["access_token"]

    change_payload = {"current_password": "WrongOld1", "new_password": "DoesNotMatter1"}
    change_resp = await client.put(
        "/users/me/password",
        json=change_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change_resp.status_code == 400