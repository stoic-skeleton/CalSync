from typing import Generator

from fastapi import Depends, HTTPException, Request
from starlette import status
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.auth import decode_access_token
from app.config import settings
from app.models import User


def _get_token_from_request(request: Request) -> str | None:
    # 1. Prefer httpOnly cookie (desktop browsers, same-site)
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        return token
    # 2. Fall back to Authorization: Bearer header (mobile Safari / cross-origin ITP)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer "):]
    return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.tier != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user


def require_tier(min_tier: str):
    def _dep(current_user: User = Depends(get_current_user)) -> User:
        tiers = ["freemium", "pro", "admin"]
        if tiers.index(current_user.tier) < tiers.index(min_tier):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient plan")
        return current_user

    return _dep
