from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_user
from ..models import Book, Comment, User
from ..schemas.comment import CommentCreate, CommentRead

router = APIRouter(prefix="/books/{book_id}/comments", tags=["comments"])


@router.get("/")
async def list_comments(book_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> list[CommentRead]:
    book = await session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    res = await session.execute(select(Comment).where(Comment.book_id == book_id).order_by(Comment.created_at.desc()))
    out: list[CommentRead] = []
    for c in res.scalars():
        out.append(
            CommentRead(
                id=str(c.id),
                user_id=str(c.user_id),
                username=c.user.username if c.user else "",
                rating=c.rating,
                content=c.content,
                created_at=c.created_at.isoformat(),
            )
        )
    return out


@router.post("/", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
async def add_comment(
    book_id: uuid.UUID,
    payload: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CommentRead:
    book = await session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    comment = Comment(book_id=book_id, user_id=current_user.id, rating=payload.rating, content=payload.content)
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return CommentRead(
        id=str(comment.id),
        user_id=str(comment.user_id),
        username=current_user.username,
        rating=comment.rating,
        content=comment.content,
        created_at=comment.created_at.isoformat(),
    )
