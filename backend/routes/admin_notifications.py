"""Administrative endpoints for system notifications and alerts."""

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User
from ..schemas.admin_notifications import AdminNotificationResponse
from ..services.system_health import SystemHealthService

router = APIRouter(prefix="/admin/notifications", tags=["admin-notifications"])


@router.get("/", response_model=List[AdminNotificationResponse])
async def get_admin_notifications(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[AdminNotificationResponse]:
    """Get system notifications and alerts."""

    # Get real system health notifications
    notifications = SystemHealthService.get_system_notifications()

    # Add timestamps
    current_time = datetime.now()
    for notification in notifications:
        notification.timestamp = current_time

    return notifications