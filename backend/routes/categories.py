from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_optional_current_user
from ..models.user import UserRole
from ..schemas import category as category_schema
from ..services import categories as categories_service

router = APIRouter(prefix="/categories", tags=["categories"])


def _require_admin_or_moderator(user) -> None:
    if user is None or user.role not in (UserRole.ADMIN, UserRole.MODERATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")


@router.get("/", response_model=list[category_schema.CategoryRead])
async def list_categories(session: AsyncSession = Depends(get_session)):
    items = await categories_service.list_categories(session)
    return [category_schema.CategoryRead(name=name, usage_count=count) for name, count in items]


@router.post("/", response_model=category_schema.CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: category_schema.CategoryCreate,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_optional_current_user),
):
    _require_admin_or_moderator(current_user)
    cat = await categories_service.create_category(session, payload.name)
    # usage_count is 0 on creation
    return category_schema.CategoryRead(name=cat.name, usage_count=0)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    name: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_optional_current_user),
):
    _require_admin_or_moderator(current_user)
    ok = await categories_service.delete_category(session, name)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found or is in use")
    return None
