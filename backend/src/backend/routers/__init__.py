from .admin import router as admin_router
from .auth import router as auth_router
from .chat import router as chat_router
from .courses import router as courses_router
from .enrollments import router as enrollments_router
from .fees import router as fees_router
from .trial_requests import router as trial_requests_router

__all__ = [
    "admin_router",
    "auth_router",
    "chat_router",
    "courses_router",
    "enrollments_router",
    "fees_router",
    "trial_requests_router",
]
