from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from starlette import status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import UserRegister, UserLogin, UserOut
from app.services.auth import hash_password, verify_password, create_access_token, get_google_auth_url, exchange_google_code
from app.config import settings
from app.models import User
from app.dependencies import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        name=payload.name,
        hashed_password=hash_password(payload.password),
        tier="freemium",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    is_prod = settings.environment == "production"
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )
    return user


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/google")
def google_auth():
    url = get_google_auth_url()
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str | None = None, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    data = await exchange_google_code(code)
    userinfo = data.get("userinfo") or {}
    google_id = userinfo.get("sub")
    email = (userinfo.get("email") or "").lower()
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    # Upsert user by google_id or email
    user = None
    if google_id:
        user = db.query(User).filter(User.google_id == google_id).one_or_none()
    if not user and email:
        user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        user = User(email=email, name=name, picture_url=picture, google_id=google_id, tier="freemium")
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        changed = False
        if google_id and not user.google_id:
            user.google_id = google_id
            changed = True
        if name and not user.name:
            user.name = name
            changed = True
        if picture and not user.picture_url:
            user.picture_url = picture
            changed = True
        if changed:
            db.add(user)
            db.commit()
            db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    redirect = settings.frontend_url or "/"
    response = RedirectResponse(redirect)
    is_prod = settings.environment == "production"
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )
    return response
