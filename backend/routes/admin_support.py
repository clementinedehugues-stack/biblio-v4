"""Administrative endpoints for support tickets and user assistance."""

from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..dependencies import get_current_admin_user
from ..models.user import User
from ..schemas.admin_support import AdminTicketResponse

router = APIRouter(prefix="/admin/tickets", tags=["admin-support"])


@router.get("/", response_model=List[AdminTicketResponse])
async def get_admin_tickets(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin_user),
) -> List[AdminTicketResponse]:
    """Get support tickets and user assistance requests (placeholder for future ticketing system)."""

    # For now, return mock data since we don't have a tickets table
    # In a real app, you'd have a support_tickets table
    mock_tickets = [
        AdminTicketResponse(
            id=1,
            user="john_doe",
            subject="Cannot upload PDF files",
            status="open",
            timestamp=datetime.now()
        ),
        AdminTicketResponse(
            id=2,
            user="jane_smith",
            subject="Book search not working",
            status="resolved",
            timestamp=datetime.now()
        )
    ]

    return mock_tickets