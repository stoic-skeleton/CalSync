import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import engine, Base
from app.models import League, Team, Event, CalendarFeed  # noqa: F401 — register models
from app.routers import leagues, events, feeds
from app.seed import seed
from app.services.scheduler import create_scheduler, _run_all_ingestions

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


async def _delayed_ingestion(delay: float) -> None:
    """Re-run ingestion after a delay — catches DNS failures at container startup."""
    await asyncio.sleep(delay)
    await _run_all_ingestions()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (idempotent; Alembic handles migrations in prod)
    Base.metadata.create_all(bind=engine)

    # Seed league rows if the table is empty (idempotent)
    seed()

    # Start scheduler
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("Scheduler started.")

    # First pass immediately — most adapters work right away
    asyncio.create_task(_run_all_ingestions())
    # Second pass after 30s — catches DNS failures (e.g. Jolpica) that fail at cold start
    asyncio.create_task(_delayed_ingestion(30))

    yield

    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped.")


app = FastAPI(
    title="CalSync API",
    version="0.1.0",
    description="Sports schedule ingestion and .ics calendar feed service.",
    lifespan=lifespan,
)

# CORS
# allow_origin_regex covers all Vercel preview deployments (*.vercel.app)
# allow_origins covers exact origins set via CORS_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(leagues.router)
app.include_router(events.router)
app.include_router(feeds.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "environment": settings.environment}
