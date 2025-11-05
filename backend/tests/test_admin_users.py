from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _bootstrap_admin(client: AsyncClient) -> dict[str, str]:
    admin_payload = {
        "username": "superadmin",
        "password": "AdminPass123",
        "full_name": "Super Admin",
        "role": "admin",
    }
    response = await client.post("/auth/create", json=admin_payload)
    assert response.status_code == 201
    login = await client.post("/auth/login", json={"username": admin_payload["username"], "password": admin_payload["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    admin_payload["token"] = token
    return admin_payload


@pytest.mark.asyncio
async def test_admin_can_create_list_reset_and_delete_users(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    headers = {"Authorization": f"Bearer {admin['token']}"}

    user_payload = {
        "username": "archivist",
        "password": "Archivist123",
        "full_name": "Archive Keeper",
        "role": "user",
    }
    create_resp = await client.post("/admin/users/", json=user_payload, headers=headers)
    assert create_resp.status_code == 201, create_resp.json()
    created_user = create_resp.json()

    list_resp = await client.get("/admin/users/", headers=headers)
    assert list_resp.status_code == 200
    users = list_resp.json()
    assert any(u["username"] == user_payload["username"] for u in users)

    reset_payload = {"new_password": "NewArchivist123"}
    reset_resp = await client.put(f"/admin/users/{created_user['id']}/password", json=reset_payload, headers=headers)
    assert reset_resp.status_code == 200

    login_new = await client.post(
        "/auth/login",
        json={"username": user_payload["username"], "password": reset_payload["new_password"]},
    )
    assert login_new.status_code == 200

    delete_resp = await client.delete(f"/admin/users/{created_user['id']}", headers=headers)
    assert delete_resp.status_code == 204

    list_after_delete = await client.get("/admin/users/", headers=headers)
    assert all(u["id"] != created_user["id"] for u in list_after_delete.json())


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_routes(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    admin_headers = {"Authorization": f"Bearer {admin['token']}"}

    user_payload = {
        "username": "catalog_user",
        "password": "Catalog123",
        "full_name": "Catalog User",
        "role": "user",
    }
    create_user = await client.post("/admin/users/", json=user_payload, headers=admin_headers)
    assert create_user.status_code == 201

    login_user = await client.post(
        "/auth/login",
        json={"username": user_payload["username"], "password": user_payload["password"]},
    )
    user_token = login_user.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    forbidden_resp = await client.get("/admin/users/", headers=user_headers)
    assert forbidden_resp.status_code == 403