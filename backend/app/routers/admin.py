from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import require_admin
from app.models import User, CalendarFeed, Event
from app.schemas import AdminUserUpdate

router = APIRouter(tags=["admin"])


@router.get("/api/admin/stats")
def stats(db: Session = Depends(get_db), _admin = Depends(require_admin)):
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    freemium = db.scalar(select(func.count()).select_from(User).where(User.tier == "freemium")) or 0
    pro = db.scalar(select(func.count()).select_from(User).where(User.tier == "pro")) or 0
    admin = db.scalar(select(func.count()).select_from(User).where(User.tier == "admin")) or 0
    total_feeds = db.scalar(select(func.count()).select_from(CalendarFeed)) or 0
    total_events = db.scalar(select(func.count()).select_from(Event)) or 0
    return {
        "users": {"total": int(total_users), "freemium": int(freemium), "pro": int(pro), "admin": int(admin)},
        "feeds": {"total": int(total_feeds)},
        "events": {"total": int(total_events)},
    }


@router.get("/api/admin/users")
def list_users(page: int = 1, page_size: int = 50, db: Session = Depends(get_db), _admin = Depends(require_admin)):
    offset = (page - 1) * page_size
    stmt = select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)
    users = db.scalars(stmt).all()
    total = db.scalar(select(func.count()).select_from(User)) or 0
    return {"items": users, "total": int(total), "page": page, "page_size": page_size}


@router.patch("/api/admin/users/{user_id}")
def update_user(user_id: int, payload: AdminUserUpdate, db: Session = Depends(get_db), _admin = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.tier is not None:
        user.tier = payload.tier
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _admin = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
    db.commit()
    return {"ok": True}
