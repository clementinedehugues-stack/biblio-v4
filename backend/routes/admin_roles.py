"""Administrative endpoints for user roles management."""

from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User, UserRole
from ..schemas.admin_roles import AdminRoleResponse, AdminRoleUpdate
from ..services import user_service

router = APIRouter(prefix="/admin/roles", tags=["admin-roles"])


@router.get("/", response_model=List[AdminRoleResponse])
async def get_admin_roles(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[AdminRoleResponse]:
    """Get all users with their roles for administrative management."""

    result = await session.execute(select(User).order_by(User.username))
    users = result.scalars().all()

    return [
        AdminRoleResponse(
            id=user.id,
            username=user.username,
            full_name=user.full_name or "",
            role=user.role.value
        )
        for user in users
    ]


@router.put("/{user_id}", response_model=AdminRoleResponse)
async def update_admin_role(
    user_id: UUID,
    payload: AdminRoleUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin_user),
) -> AdminRoleResponse:
    """Update a user's role."""

    user = await user_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Validate role
    try:
        new_role = UserRole(payload.role.lower())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    original_role = user.role.value

    # Guard: prevent demoting the last admin
    if user.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
        result = await session.execute(select(User).where(User.role == UserRole.ADMIN))
        admin_users = result.scalars().all()
        if len(admin_users) <= 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote the last admin user")

    # Update role
    user.role = new_role
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Log the action
    from ..services.audit import AuditService
    await AuditService.log_action(
        session=session,
        user=current_admin,
        action=f"Updated role for user: {user.username}",
        resource_type="user",
        resource_id=str(user.id),
        details=f"Role changed from '{original_role}' to '{user.role.value}'",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )

    return AdminRoleResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name or "",
        role=user.role.value
    )