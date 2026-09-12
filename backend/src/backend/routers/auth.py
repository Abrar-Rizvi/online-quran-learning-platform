from fastapi import APIRouter, HTTPException, status

from ..auth import create_access_token, verify_admin_password
from ..config import settings
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    username_matches = settings.admin_username is not None and (
        payload.username == settings.admin_username
    )
    password_matches = username_matches and verify_admin_password(
        payload.password
    )

    if not password_matches:
        # Generic message on purpose — do not reveal which field was wrong.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(payload.username))
