"""Schemas dedicated to administrative and self-service user management."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, SecretStr

try:  # Pydantic v2
    from pydantic import ConfigDict  # type: ignore
    _PYDANTIC_V2 = True
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore
    _PYDANTIC_V2 = False

from ..models.user import UserRole


class AdminUserCreate(BaseModel):
    """Payload accepted by administrators when creating users."""

    username: str = Field(..., max_length=150)
    full_name: str = Field(..., max_length=255)
    role: UserRole = Field(default=UserRole.USER)
    password: SecretStr = Field(..., min_length=8)


class AdminUserRead(BaseModel):
    """Representation of a user in administrative listings."""

    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime
    if _PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)  # type: ignore[name-defined]
    else:  # pragma: no cover
        class Config:  # type: ignore[no-redef]
            orm_mode = True

    @classmethod
    def from_model(cls, user: object) -> "AdminUserRead":
        if hasattr(cls, "model_validate"):
            return cls.model_validate(user)  # type: ignore[attr-defined]
        return cls.from_orm(user)


class AdminPasswordReset(BaseModel):
    """Payload for administrators resetting user passwords."""

    new_password: SecretStr = Field(..., min_length=8)


class AdminUserUpdate(BaseModel):
    """Partial update payload for admin user profile updates."""

    username: str | None = Field(None, max_length=150)
    full_name: str | None = Field(None, max_length=255)
    role: UserRole | None = None


class UserSelfRead(BaseModel):
    """Payload returned when a user inspects their own profile."""

    id: uuid.UUID
    username: str
    full_name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime
    if _PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)  # type: ignore[name-defined]
    else:  # pragma: no cover
        class Config:  # type: ignore[no-redef]
            orm_mode = True

    @classmethod
    def from_model(cls, user: object) -> "UserSelfRead":
        if hasattr(cls, "model_validate"):
            return cls.model_validate(user)  # type: ignore[attr-defined]
        return cls.from_orm(user)


class UserPasswordChange(BaseModel):
    """Payload submitted by a user when changing their password."""

    current_password: SecretStr = Field(..., min_length=8)
    new_password: SecretStr = Field(..., min_length=8)
