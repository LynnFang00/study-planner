import os
import httpx
from jose import jwt
from fastapi import Header, HTTPException

_jwks_cache = None


def _get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        url = os.getenv("CLERK_JWKS_URL")
        if not url:
            raise HTTPException(status_code=500, detail="CLERK_JWKS_URL not configured")
        _jwks_cache = httpx.get(url, timeout=10).json()
    return _jwks_cache


def get_current_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            _get_jwks(),
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload["sub"]  # e.g. "user_2abc..."
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
