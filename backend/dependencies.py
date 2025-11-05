"""FastAPI dependency injection functions for authentication and authorization."""

from __future__ import annotations

import uuid
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_session
from .models.user import User, UserRole
from .services import auth as auth_service

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
_http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    session: AsyncSession = Depends(get_session),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Extract and validate current user from JWT token.
    
    Args:
        session: Database session
        token: JWT token from Authorization header
        
    Returns:
        Current authenticated user
        
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    payload = auth_service.parse_token_payload(token)
    user = await auth_service.get_user_by_id(session, payload.sub)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    return user


async def get_optional_current_user(
    session: AsyncSession = Depends(get_session),
    credentials: HTTPAuthorizationCredentials | None = Security(_http_bearer),
) -> User | None:
    """
    Extract current user from optional JWT token.
    
    Args:
        session: Database session
        credentials: Optional JWT credentials
        
    Returns:
        Current user or None if no credentials provided
        
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    if credentials is None:
        return None
    payload = auth_service.parse_token_payload(credentials.credentials)
    user = await auth_service.get_user_by_id(session, payload.sub)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    return user


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensure current user has admin privileges.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Admin user
        
    Raises:
        HTTPException: 403 if user is not admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required")
    return current_user


async def require_admin_user(current_user: User = Depends(get_current_admin_user)) -> User:
    """
    Alias for get_current_admin_user for consistency.
    
    Args:
        current_user: Current admin user
        
    Returns:
        Admin user
    """
    return current_user
