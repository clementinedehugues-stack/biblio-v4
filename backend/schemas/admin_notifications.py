"""Schemas for admin notifications and alerts."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminNotificationResponse(BaseModel):
    """Response schema for admin notifications."""
    id: int
    type: str  # "info", "warning", "error"
    message: str
    timestamp: datetime