from __future__ import annotations

"""
Seed a few test users into the database for local development.

Creates (idempotent):
  - Admin:    username="superadmin",  password="AdminPass123",  full_name="Super Admin"
  - Moderator:username="moderator1",  password="ModeratorPass123", full_name="Moderator One"
  - User:     username="viewer1",     password="ViewerPass123",    full_name="Viewer One"

Usage:
  - Ensure your database is running and backend/.env has a valid DATABASE_URL
  - Run:  python -m backend.scripts.seed_test_users
"""

import asyncio
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session_factory
from ..models.user import User, UserRole
from ..schemas.auth import UserCreate
from ..services import auth as auth_service


ADMIN = {
    "username": "superadmin",
    "password": "AdminPass123",
    "full_name": "Super Admin",
    "role": UserRole.ADMIN,
}

MODERATOR = {
    "username": "moderator1",
    "password": "ModeratorPass123",
    "full_name": "Moderator One",
    "role": UserRole.MODERATOR,
}

VIEWER = {
    "username": "viewer1",
    "password": "ViewerPass123",
    "full_name": "Viewer One",
    "role": UserRole.USER,
}


async def _get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    res = await session.execute(select(User).where(User.username == username))
    return res.scalar_one_or_none()


async def _ensure_admin(session: AsyncSession) -> User:
    # If any user exists, try to fetch an admin to use as "requesting_user" for subsequent creations
    existing_admin = await session.execute(select(User).where(User.role == UserRole.ADMIN))
    admin_user = existing_admin.scalar_one_or_none()
    if admin_user:
        return admin_user

    # Otherwise create the very first user as admin (no requesting_user required)
    admin_payload = UserCreate(
        username=ADMIN["username"],
        password=ADMIN["password"],
        full_name=ADMIN["full_name"],
        role=ADMIN["role"],
    )
    try:
        created = await auth_service.create_user(session, admin_payload, requesting_user=None)
        print(f"✔ Created admin: {created.username}")
        return created
    except Exception as exc:  # noqa: BLE001
        # Could be "Username already registered" if re-run
        existing = await _get_user_by_username(session, ADMIN["username"])
        if existing:
            print(f"• Admin already exists: {existing.username}")
            return existing
        raise exc


async def _ensure_user(session: AsyncSession, admin_user: User, data: dict) -> User:
    existing = await _get_user_by_username(session, data["username"])
    if existing:
        print(f"• User already exists: {existing.username} ({existing.role.value})")
        return existing
    payload = UserCreate(
        username=data["username"],
        password=data["password"],
        full_name=data["full_name"],
        role=data["role"],
    )
    created = await auth_service.create_user(session, payload, requesting_user=admin_user)
    print(f"✔ Created user: {created.username} ({created.role.value})")
    return created


async def main() -> None:
    async with async_session_factory() as session:
        admin_user = await _ensure_admin(session)
        await _ensure_user(session, admin_user, MODERATOR)
        await _ensure_user(session, admin_user, VIEWER)

        print("\nTest credentials ready:")
        print(f"  Admin     -> {ADMIN['username']} / {ADMIN['password']}")
        print(f"  Moderator -> {MODERATOR['username']} / {MODERATOR['password']}")
        print(f"  User      -> {VIEWER['username']} / {VIEWER['password']}")


if __name__ == "__main__":
    asyncio.run(main())
