from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import create_access_token
from ..database import get_session
from ..dependencies import get_current_user, get_optional_current_user
from ..models.user import User
from ..schemas.auth import Token, UserCreate, UserLogin, UserRead
from ..services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_session)) -> Token:
    """
    Authenticate user and return access token.
    
    Args:
        credentials: Username and password
        session: Database session dependency
        
    Returns:
        JWT access token
        
    Raises:
        HTTPException: 401 if credentials are invalid
    """
    user = await auth_service.authenticate_user(session, credentials.username, credentials.password.get_secret_value())
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.value})
    return Token(access_token=token)


@router.post("/create", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_current_user),
) -> UserRead:
    """
    Create a new user account.
    
    Args:
        payload: User creation data
        session: Database session dependency
        current_user: Current authenticated user (optional)
        
    Returns:
        Created user details
    """
    user = await auth_service.create_user(session, payload, current_user)
    return UserRead.from_model(user)


@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)) -> UserRead:
    """
    Get current user profile information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user details
    """
    return UserRead.from_model(current_user)
