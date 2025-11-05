"""Schemas for admin roles management."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel


class AdminRoleResponse(BaseModel):
    """Response schema for user role information."""
    id: UUID
    username: str
    full_name: str
    role: str


class AdminRoleUpdate(BaseModel):
    """Request schema for updating user role."""
    role: str  # "admin", "moderator", "user"