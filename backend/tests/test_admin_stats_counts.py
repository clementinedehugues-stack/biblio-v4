from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _bootstrap_admin(client: AsyncClient) -> dict[str, str]:
    admin_payload = {
        "username": "statsadmin",
        "password": "StatsAdmin123",
        "full_name": "Stats Admin",
        "role": "admin",
    }
    response = await client.post("/auth/create", json=admin_payload)
    assert response.status_code == 201
    login = await client.post(
        "/auth/login",
        json={"username": admin_payload["username"], "password": admin_payload["password"]},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    admin_payload["token"] = token
    return admin_payload


@pytest.mark.asyncio
async def test_admin_counts_endpoint_returns_numbers(client: AsyncClient) -> None:
    admin = await _bootstrap_admin(client)
    headers = {"Authorization": f"Bearer {admin['token']}"}

    res = await client.get("/admin/stats/counts", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert set(data.keys()) == {"users", "books", "categories"}
    assert isinstance(data["users"], int)
    assert isinstance(data["books"], int)
    assert isinstance(data["categories"], int)

    # At least the admin user exists
    assert data["users"] >= 1
