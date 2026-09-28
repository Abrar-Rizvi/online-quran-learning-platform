import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import models  # noqa: F401  (register tables with SQLModel.metadata)
from .auth import warm_admin_hash
from .config import settings
from .routers import (
    admin_blog_router,
    admin_trial_requests_router,
    admin_router,
    auth_router,
    blog_router,
    chat_router,
    courses_router,
    enrollments_router,
    fees_router,
    trial_requests_router,
)

log = logging.getLogger("uvicorn.error")
IS_DEV = settings.is_development
log.info("APP_ENV is %s.", settings.app_env)

# Weak or missing admin secrets: refuse to start in production, only warn in development.
_secret_problems = settings.secret_problems()
if _secret_problems and not IS_DEV:
    raise RuntimeError("Refusing to start (APP_ENV=production): " + "; ".join(_secret_problems) + ".")
for problem in _secret_problems:
    log.warning("Insecure configuration (allowed only because APP_ENV=development): %s.", problem)
warm_admin_hash()

# API docs only in development; in production /docs, /redoc and /openapi.json are 404s.
app = FastAPI(
    title="Online Quran Backend",
    docs_url="/docs" if IS_DEV else None,
    redoc_url="/redoc" if IS_DEV else None,
    openapi_url="/openapi.json" if IS_DEV else None,
)


def _allowed_origins() -> list[str]:
    """FRONTEND_URL + ALLOWED_ORIGINS (comma-separated), trimmed, no trailing slash.

    Development also allows http://localhost:3000. "*" is never allowed:
    credentials are enabled, and a wildcard must not be combined with them.
    """
    raw = [settings.frontend_url or "", *settings.allowed_origins.split(",")]
    if IS_DEV:
        raw.append("http://localhost:3000")
    origins: list[str] = []
    for value in raw:
        origin = value.strip().rstrip("/")
        if origin == "*":
            log.warning("Ignoring '*' in CORS origins: it can't be combined with credentials.")
        elif origin and origin not in origins:
            origins.append(origin)
    if not origins:
        log.warning("CORS: no allowed origins configured (set FRONTEND_URL / ALLOWED_ORIGINS); browsers can't call this API.")
    return origins


class CatchUnhandledErrors:
    """Turns unhandled exceptions into a generic 500 INSIDE the CORS middleware.

    Starlette's own 500 handler sits outside every middleware, so its response
    has no CORS headers and the browser only reports "Failed to fetch". The
    real error is logged here; the client gets a generic message.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        started = False

        async def send_wrapper(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            log.exception("Unhandled error on %s %s", scope.get("method"), scope.get("path"))
            if started:
                raise
            response = JSONResponse({"detail": "Something went wrong. Please try again."}, status_code=500)
            await response(scope, receive, send)


# Order matters: the last middleware added runs first, so CORS wraps the error catcher.
app.add_middleware(CatchUnhandledErrors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses_router)
app.include_router(fees_router)
app.include_router(enrollments_router)
app.include_router(trial_requests_router)
app.include_router(blog_router)
# The public chatbot endpoint stays off until it is hardened (timeouts, limits,
# conversation ownership). Admin conversation endpoints are always available.
if settings.chat_enabled:
    app.include_router(chat_router)
log.info(
    "Chat endpoint (POST /chat) is %s (CHAT_ENABLED).", "enabled" if settings.chat_enabled else "disabled"
)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(admin_blog_router)
app.include_router(admin_trial_requests_router)


@app.get("/health")
def health():
    return {"status": "ok"}
