"""Schemas for admin logs and audit trail."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminLogResponse(BaseModel):
    """Response schema for admin log entries."""
    id: int
    user: str
    action: str
    timestamp: datetime