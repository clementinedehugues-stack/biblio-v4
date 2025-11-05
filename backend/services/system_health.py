"""System health monitoring service for admin notifications."""

from __future__ import annotations

import os
import psutil
from pathlib import Path
from typing import List

from ..schemas.admin_notifications import AdminNotificationResponse


class SystemHealthService:
    """Service for monitoring system health and generating notifications."""

    @staticmethod
    def get_system_notifications() -> List[AdminNotificationResponse]:
        """Get system health notifications."""
        notifications = []

        # Check disk space
        disk_usage = psutil.disk_usage('/')
        disk_percent = disk_usage.percent

        if disk_percent > 90:
            notifications.append(AdminNotificationResponse(
                id=1,
                type="error",
                message=f"Critical: Disk space is at {disk_percent:.1f}% capacity",
                timestamp=None  # Will be set by caller
            ))
        elif disk_percent > 80:
            notifications.append(AdminNotificationResponse(
                id=2,
                type="warning",
                message=f"Warning: Disk space is at {disk_percent:.1f}% capacity",
                timestamp=None
            ))

        # Check memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent

        if memory_percent > 90:
            notifications.append(AdminNotificationResponse(
                id=3,
                type="error",
                message=f"Critical: Memory usage is at {memory_percent:.1f}%",
                timestamp=None
            ))
        elif memory_percent > 80:
            notifications.append(AdminNotificationResponse(
                id=4,
                type="warning",
                message=f"Warning: Memory usage is at {memory_percent:.1f}%",
                timestamp=None
            ))

        # Check uploads directory
        uploads_dir = Path(os.getenv("UPLOAD_DIR", "/workspace/backend/uploads"))
        if uploads_dir.exists():
            try:
                # Get uploads directory size
                total_size = sum(f.stat().st_size for f in uploads_dir.rglob('*') if f.is_file())
                size_mb = total_size / (1024 * 1024)

                if size_mb > 1000:  # More than 1GB
                    notifications.append(AdminNotificationResponse(
                        id=5,
                        type="info",
                        message=f"Uploads directory size: {size_mb:.1f} MB",
                        timestamp=None
                    ))
            except Exception:
                notifications.append(AdminNotificationResponse(
                    id=6,
                    type="warning",
                    message="Unable to check uploads directory size",
                    timestamp=None
                ))
        else:
            notifications.append(AdminNotificationResponse(
                id=7,
                type="warning",
                message="Uploads directory not found",
                timestamp=None
            ))

        # If no issues, return a success notification
        if not notifications:
            notifications.append(AdminNotificationResponse(
                id=8,
                type="info",
                message="System health: All checks passed",
                timestamp=None
            ))

        return notifications