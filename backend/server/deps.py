from __future__ import annotations

from fastapi import HTTPException, Request, status


async def require_auth(request: Request) -> str:
    """Returns username if authenticated. Raises 401 otherwise."""
    from server.auth import get_current_user_from_cookie
    username = get_current_user_from_cookie(request)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return username


async def require_admin(request: Request) -> str:
    """Returns username if authenticated and admin. Raises 401/403 otherwise."""
    from server.auth import get_current_user_role_from_cookie
    result = get_current_user_role_from_cookie(request)
    if result is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    username, role = result
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return username
