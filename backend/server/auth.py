from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Form, HTTPException, Request, Response, status
from jose import JWTError, jwt

router = APIRouter()

_ALGORITHM = "HS256"

def _secret() -> str:
    return os.getenv("AUTH_SECRET", "change-me")

def _cookie_name() -> str:
    return os.getenv("AUTH_COOKIE_NAME", "brew_session")

def _expire_hours() -> int:
    return int(os.getenv("AUTH_TOKEN_EXPIRE_HOURS", "168"))

def _admin_username() -> str:
    return os.getenv("AUTH_USER_1_NAME", "admin").strip()


def _load_users() -> dict[str, str]:
    """Load {username: hash} from env vars AUTH_USER_N_NAME / AUTH_USER_N_HASH."""
    users: dict[str, str] = {}
    for i in range(1, 4):
        name = os.getenv(f"AUTH_USER_{i}_NAME", "").strip()
        hsh = os.getenv(f"AUTH_USER_{i}_HASH", "").strip()
        if name and hsh:
            users[name] = hsh
    return users


def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def _create_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_expire_hours())
    return jwt.encode({"sub": username, "role": role, "exp": expire}, _secret(), algorithm=_ALGORITHM)


def get_current_user_from_cookie(request: Request) -> Optional[str]:
    token = request.cookies.get(_cookie_name())
    if not token:
        return None
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def get_current_user_role_from_cookie(request: Request) -> Optional[tuple[str, str]]:
    """Returns (username, role) tuple or None if not authenticated."""
    token = request.cookies.get(_cookie_name())
    if not token:
        return None
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role", "viewer")
        if not username:
            return None
        return (username, role)
    except JWTError:
        return None


@router.post("/login")
async def login(response: Response, username: str = Form(...), password: str = Form(...)):
    users = _load_users()
    hashed = users.get(username)
    if not hashed or not _verify(password, hashed):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    role = "admin" if username == _admin_username() else "viewer"
    token = _create_token(username, role)
    secure = os.getenv("AUTH_SECURE_COOKIE", "false").lower() == "true"
    response.set_cookie(
        key=_cookie_name(),
        value=token,
        httponly=True,
        samesite="strict",
        secure=secure,
        max_age=_expire_hours() * 3600,
    )
    return {"username": username}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(_cookie_name())
    return {"ok": True}


@router.get("/me")
async def me(request: Request):
    result = get_current_user_role_from_cookie(request)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    username, role = result
    return {"username": username, "role": role}
