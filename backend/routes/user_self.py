"""Endpoints allowing authenticated users to inspect and manage their own profile."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_user
from ..models.user import User
from ..schemas.user_management import UserPasswordChange, UserSelfRead
from ..services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserSelfRead)
async def read_profile(current_user: User = Depends(get_current_user)) -> UserSelfRead:
    """Return the profile of the currently authenticated user."""

    return UserSelfRead.from_model(current_user)


@router.put("/me/password", response_model=UserSelfRead)
async def change_password(
    payload: UserPasswordChange,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserSelfRead:
    """Allow the authenticated user to change their password."""

    await user_service.change_password(
        session,
        user=current_user,
        old_password=payload.current_password.get_secret_value(),
        new_password=payload.new_password.get_secret_value(),
    )
    return UserSelfRead.from_model(current_user)
