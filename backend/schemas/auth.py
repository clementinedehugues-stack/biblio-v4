"""Pydantic models exposed by the authentication API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, SecretStr
try:  # Pydantic v2
    from pydantic import ConfigDict  # type: ignore
    _PYDANTIC_V2 = True
except Exception:  # pragma: no cover - fallback for v1
    ConfigDict = None  # type: ignore
    _PYDANTIC_V2 = False

from ..models.user import UserRole


class Token(BaseModel):
    """Structure returned after a successful authentication."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type hint")


class TokenPayload(BaseModel):
    """Payload extracted from a JWT token."""

    sub: uuid.UUID
    role: UserRole
    exp: int


class UserBase(BaseModel):
    """Base schema shared by user representations."""

    username: str = Field(..., max_length=150)
    full_name: str = Field(..., max_length=255)
    role: UserRole = Field(default=UserRole.USER)


class UserRead(UserBase):
    """User representation exposed via the API."""

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    if _PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)  # type: ignore[name-defined]
    else:  # Pydantic v1
        class Config:  # type: ignore[no-redef]
            orm_mode = True
            use_enum_values = False

    @classmethod
    def from_model(cls, user: object) -> "UserRead":
        if hasattr(cls, "model_validate"):
            return cls.model_validate(user)  # type: ignore[attr-defined]
        return cls.from_orm(user)


class UserCreate(UserBase):
    """Payload accepted when creating a user."""

    password: SecretStr = Field(..., min_length=8, description="Plaintext password")
    role: UserRole = Field(default=UserRole.USER)


class UserLogin(BaseModel):
    """Credentials submitted by clients during login."""

    username: str = Field(..., max_length=150)
    password: SecretStr = Field(..., min_length=8)
