from __future__ import annotations

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class CategoryRead(BaseModel):
    name: str
    usage_count: int
