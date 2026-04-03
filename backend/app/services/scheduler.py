"""
APScheduler configuration.
Runs inside the FastAPI process — no separate worker needed.
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.services.data_pipeline.f1 import F1Adapter
from app.services.data_pipeline.ipl import IPLAdapter
from app.services.data_pipeline.espn import NFLAdapter, NBAAdapter, MLSAdapter
from app.services.ingest import ingest_league

logger = logging.getLogger(__name__)

ADAPTERS = [F1Adapter(), IPLAdapter(), NFLAdapter(), NBAAdapter(), MLSAdapter()]


async def _run_all_ingestions() -> None:
    logger.info("Starting scheduled ingestion for all leagues…")
    for adapter in ADAPTERS:
        try:
            await ingest_league(adapter)
        except Exception as e:
            logger.error("Ingestion error for %s: %s", adapter.league_slug, e)
    logger.info("Ingestion complete.")


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    # Full refresh every 6 hours
    scheduler.add_job(
        _run_all_ingestions,
        trigger=IntervalTrigger(hours=6),
        id="full_refresh",
        name="Full sports schedule refresh",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Extra rapid refresh at typical peak match hours (noon & 18:00 UTC)
    scheduler.add_job(
        _run_all_ingestions,
        trigger=CronTrigger(hour="12,18", minute=0),
        id="peak_refresh",
        name="Peak time bonus refresh",
        replace_existing=True,
        misfire_grace_time=120,
    )

    return scheduler
