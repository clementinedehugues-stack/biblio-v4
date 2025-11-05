"""Utilities and helpers for user password management."""

from __future__ import annotations

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a hashed representation of a plaintext password."""

    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plaintext password matches its hashed counterpart."""

    try:
        return _pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


async def change_password(
    session: AsyncSession,
    *,
    user: User,
    old_password: str,
    new_password: str,
) -> None:
    """Allow a user to change their own password after validation."""

    if not verify_password(old_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    user.hashed_password = hash_password(new_password)
    session.add(user)
    await session.commit()
    await session.refresh(user)


async def reset_password(
    session: AsyncSession,
    *,
    user: User,
    new_password: str,
) -> None:
    """Reset the password of the specified user without old password check."""

    user.hashed_password = hash_password(new_password)
    session.add(user)
    await session.commit()
    await session.refresh(user)
