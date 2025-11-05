from __future__ import annotations

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import TokenDecodeError, safe_decode_token
from ..models.user import User, UserRole
from ..schemas.auth import TokenPayload, UserCreate
from . import user_service


async def get_user_by_username(session: AsyncSession, username: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def authenticate_user(session: AsyncSession, username: str, password: str) -> Optional[User]:
    user = await get_user_by_username(session, username)
    if user is None:
        return None
    if not user_service.verify_password(password, user.hashed_password):
        return None
    return user


async def _has_any_user(session: AsyncSession) -> bool:
    result = await session.execute(select(func.count(User.id)))
    return bool(result.scalar_one())


async def create_user(session: AsyncSession, data: UserCreate, requesting_user: Optional[User]) -> User:
    existing = await get_user_by_username(session, data.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")

    first_user = not await _has_any_user(session)
    if first_user:
        if data.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First user must be an admin")
    else:
        if requesting_user is None or requesting_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    user = User(
        username=data.username,
        hashed_password=user_service.hash_password(data.password.get_secret_value()),
        full_name=data.full_name,
        role=data.role,
    )

    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:  # pragma: no cover
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create user") from exc

    await session.refresh(user)
    return user


def parse_token_payload(token: str) -> TokenPayload:
    try:
        raw_payload = safe_decode_token(token)
    except TokenDecodeError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials") from exc

    try:
        payload = TokenPayload(**raw_payload)
    except ValueError as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials") from exc
    return payload
