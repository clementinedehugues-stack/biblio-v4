from __future__ import annotations

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    content: str | None = Field(default=None, max_length=5000)


class CommentRead(BaseModel):
    id: str
    user_id: str
    username: str
    rating: int | None
    content: str | None
    created_at: str
