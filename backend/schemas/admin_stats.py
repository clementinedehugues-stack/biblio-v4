"""Schemas for admin statistics and analytics."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel


class TopBooksResponse(BaseModel):
    """Response schema for top books statistics."""
    labels: List[str]
    data: List[int]


class ActiveUsersResponse(BaseModel):
    """Response schema for active users statistics."""
    labels: List[str]
    data: List[int]


class ReportItem(BaseModel):
    """Schema for a single report item."""
    id: int
    type: str
    target: str


class RecentReportsResponse(BaseModel):
    """Response schema for recent reports."""
    reports: List[ReportItem]