from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register tables with SQLModel.metadata)
from .config import settings
from .routers import (
    admin_router,
    auth_router,
    chat_router,
    courses_router,
    enrollments_router,
)

app = FastAPI(title="Online Quran Backend")

origins = ["http://localhost:3000"]
if settings.frontend_url:
    origins.append(settings.frontend_url)
if settings.allowed_origins:
    origins.extend(
        origin.strip()
        for origin in settings.allowed_origins.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses_router)
app.include_router(enrollments_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}
