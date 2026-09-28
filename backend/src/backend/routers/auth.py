import math

from fastapi import APIRouter, HTTPException, Request, status

from ..auth import check_admin_credentials, create_access_token
from ..rate_limit import SlidingWindowRateLimiter, client_ip, too_many_requests
from ..schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

# At most 5 FAILED attempts per client IP per 15 minutes. Successful logins
# aren't counted and don't clear earlier failures: a success only happens with
# the right password, so resetting would add nothing but complexity.
login_failures = SlidingWindowRateLimiter(max_requests=5, window_seconds=15 * 60)


def _locked_out(retry_after: float) -> HTTPException:
    minutes = max(1, math.ceil(retry_after / 60))
    unit = "minute" if minutes == 1 else "minutes"
    return too_many_requests(f"Too many login attempts. Please try again in {minutes} {unit}.", retry_after)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    ip = client_ip(request)
    retry_after = login_failures.retry_after(ip)
    if retry_after is not None:
        raise _locked_out(retry_after)

    if not check_admin_credentials(payload.username, payload.password):
        login_failures.record(ip)
        # Generic message on purpose — do not reveal which field was wrong.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=create_access_token(payload.username))
