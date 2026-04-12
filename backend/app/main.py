from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.bootstrap import create_tables_if_enabled, seed_roles_and_admin
from app.core.config import get_settings
from app.db.session import SessionLocal

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_tables_if_enabled()
    db = SessionLocal()
    try:
        seed_roles_and_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}


app.include_router(api_router)
