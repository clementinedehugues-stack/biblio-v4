"""Administrative endpoints for system logs and audit trail."""

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.audit_log import AuditLog
from ..models.user import User
from ..schemas.admin_logs import AdminLogResponse

router = APIRouter(prefix="/admin/logs", tags=["admin-logs"])


@router.get("/", response_model=List[AdminLogResponse])
async def get_admin_logs(
    limit: int = 100,
    request: Request = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> List[AdminLogResponse]:
    """Get recent admin activity logs."""

    # Log this admin action
    from ..services.audit import AuditService
    await AuditService.log_action(
        session=session,
        user=current_user,
        action="Viewed admin logs",
        resource_type="admin_logs",
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    # Get audit logs
    result = await session.execute(
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )

    logs = result.scalars().all()

    return [
        AdminLogResponse(
            id=log.id,
            user=log.user.username if log.user else "unknown",
            action=log.action,
            timestamp=log.created_at
        )
        for log in logs
    ]
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User
from ..schemas.admin_logs import AdminLogResponse

router = APIRouter(prefix="/admin/logs", tags=["admin-logs"])


@router.get("/", response_model=List[AdminLogResponse])
async def get_admin_logs(
    limit: int = 100,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[AdminLogResponse]:
    """Get recent admin activity logs (placeholder for future audit system)."""

    # For now, return mock data since we don't have an audit log table
    # In a real app, you'd have an audit_logs table tracking admin actions
    mock_logs = [
        AdminLogResponse(
            id=1,
            user="admin",
            action="User created: john_doe",
            timestamp=datetime.now()
        ),
        AdminLogResponse(
            id=2,
            user="admin",
            action="Book uploaded: Sample Book",
            timestamp=datetime.now()
        ),
        AdminLogResponse(
            id=3,
            user="moderator",
            action="Category updated: Fiction",
            timestamp=datetime.now()
        )
    ]

    return mock_logs[:limit]