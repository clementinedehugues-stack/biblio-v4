"""Administrative endpoints for managing user accounts."""

from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User, UserRole
from ..schemas.auth import UserCreate
from ..schemas.user_management import AdminPasswordReset, AdminUserCreate, AdminUserRead, AdminUserUpdate
from ..services import auth as auth_service
from ..services import user_service

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.post("/", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> AdminUserRead:
    """Create a new user account managed by the administrator."""

    user_payload = UserCreate(
        username=payload.username,
        full_name=payload.full_name,
        role=payload.role,
        password=payload.password,
    )
    user = await auth_service.create_user(session, user_payload, current_admin)

    # Log the action
    from ..services.audit import AuditService
    await AuditService.log_action(
        session=session,
        user=current_admin,
        action=f"Created user: {user.username}",
        resource_type="user",
        resource_id=str(user.id),
        details=f"Role: {user.role.value}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return AdminUserRead.from_model(user)


@router.get("/", response_model=List[AdminUserRead])
async def list_users(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[AdminUserRead]:
    """List all registered users for administrative overview."""

    result = await session.execute(select(User).order_by(User.username))
    users = result.scalars().all()
    return [AdminUserRead.from_model(user) for user in users]


@router.put("/{user_id}/password", response_model=AdminUserRead)
async def reset_password(
    user_id: uuid.UUID,
    payload: AdminPasswordReset,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> AdminUserRead:
    """Reset the password for the specified user."""

    user = await auth_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await user_service.reset_password(
        session,
        user=user,
        new_password=payload.new_password.get_secret_value(),
    )
    return AdminUserRead.from_model(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_user(
    user_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> Response:
    """Delete the specified user account."""

    user = await auth_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # Guard: prevent deleting the last admin
    if user.role == UserRole.ADMIN:
        result = await session.execute(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
        admin_count = int(result.scalar_one())
        if admin_count <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete the last admin user")

    # Log the action before deleting
    from ..services.audit import AuditService
    await AuditService.log_action(
        session=session,
        user=current_admin,
        action=f"Deleted user: {user.username}",
        resource_type="user",
        resource_id=str(user.id),
        details=f"Role: {user.role.value}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    await session.delete(user)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{user_id}", response_model=AdminUserRead)
async def update_user_profile(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> AdminUserRead:
    """Partially update a user's username, full_name, or role.

    Validates uniqueness for username and constrains role to known values.
    """
    user = await auth_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Store original values for logging
    original_username = user.username
    original_full_name = user.full_name
    original_role = user.role.value

    # Validate duplicate username if changed
    if payload.username and payload.username != user.username:
        from sqlalchemy import select
        exists_q = await session.execute(select(User).where(User.username == payload.username))
        conflict = exists_q.scalar_one_or_none()
        if conflict is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already in use")

    # Apply changes
    changes = []
    if payload.username is not None:
        if not payload.username.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")
        user.username = payload.username.strip()
        changes.append(f"username: '{original_username}' -> '{user.username}'")
    if payload.full_name is not None:
        if not payload.full_name.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name cannot be empty")
        user.full_name = payload.full_name.strip()
        changes.append(f"full_name: '{original_full_name}' -> '{user.full_name}'")
    if payload.role is not None:
        # Guard: prevent demoting the last admin
        if user.role == UserRole.ADMIN and payload.role != UserRole.ADMIN:
            result = await session.execute(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN))
            admin_count = int(result.scalar_one())
            if admin_count <= 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote the last admin user")
        user.role = payload.role
        changes.append(f"role: '{original_role}' -> '{user.role.value}'")

    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Log the action
    if changes:
        from ..services.audit import AuditService
        await AuditService.log_action(
            session=session,
            user=current_admin,
            action=f"Updated user: {user.username}",
            resource_type="user",
            resource_id=str(user.id),
            details="; ".join(changes),
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent"),
        )

    return AdminUserRead.from_model(user)
