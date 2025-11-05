"""Schemas for admin support tickets."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdminTicketResponse(BaseModel):
    """Response schema for support tickets."""
    id: int
    user: str
    subject: str
    status: str  # "open", "in_progress", "resolved", "closed"
    timestamp: datetime