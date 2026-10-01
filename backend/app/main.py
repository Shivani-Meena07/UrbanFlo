from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import Base, engine, SessionLocal
from app.api.routes import router
from app.services.seed import seed_demo_drainage_assets


def create_app() -> FastAPI:

    app = FastAPI(
        title="FloodGuard Backend",
        description=(
            "Flood early-warning backend: live weather ingestion, "
            "hydrology calculations, and SWMM drainage simulation."
        ),
        version="1.0.0"
    )

    # Creates SQLite (or whatever DATABASE_URL points at) tables on
    # startup if they don't already exist. For a real deployment,
    # replace this with Alembic migrations (see alembic/ and
    # `alembic upgrade head`) instead of relying on create_all,
    # which can't handle schema changes to existing tables.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_demo_drainage_assets(db)
    finally:
        db.close()

    # CORS origins come from settings.ALLOWED_ORIGINS ("*" only by
    # default in demo mode). Set ALLOWED_ORIGINS in .env to a real
    # comma-separated origin list before deploying anywhere public.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=settings.ALLOWED_ORIGINS != "*",
        allow_methods=["*"],
        allow_headers=["*"]
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(router, prefix="/api")

    # Static mount for uploaded hazard photos
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    from fastapi.staticfiles import StaticFiles
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    return app



app = create_app()


if __name__ == "__main__":

    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEMO_MODE)
