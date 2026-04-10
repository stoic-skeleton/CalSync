from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from fastapi import HTTPException
from starlette import status

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode.update({"exp": expire})
    if not settings.secret_key:
        raise RuntimeError("SECRET_KEY is not configured")
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    if not settings.secret_key:
        raise RuntimeError("SECRET_KEY is not configured")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials") from e


# --- Google OAuth helpers ---

def get_google_auth_url(state: Optional[str] = None) -> str:
    if not settings.google_client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured")
    redirect_uri = f"{settings.api_base_url.rstrip('/')}" + "/api/auth/google/callback"
    scope = "openid email profile"
    params = {
        "client_id": settings.google_client_id,
        "response_type": "code",
        "scope": scope,
        "redirect_uri": redirect_uri,
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    url = "https://accounts.google.com/o/oauth2/v2/auth"
    return httpx.URL(url).include_query_params(**params).human_repr()


async def exchange_google_code(code: str) -> dict[str, Any]:
    if not (settings.google_client_id and settings.google_client_secret):
        raise RuntimeError("Google OAuth client credentials not configured")
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = f"{settings.api_base_url.rstrip('/')}" + "/api/auth/google/callback"
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(token_url, data=data, timeout=10)
        r.raise_for_status()
        token_data = r.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Unable to obtain access token from Google")
        userinfo = await get_google_userinfo(access_token)
        return {"token_data": token_data, "userinfo": userinfo}


async def get_google_userinfo(access_token: str) -> dict[str, Any]:
    url = "https://www.googleapis.com/oauth2/v3/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=10)
        r.raise_for_status()
        return r.json()
