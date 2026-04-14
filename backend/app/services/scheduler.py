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
from app.services.data_pipeline.espn import NFLAdapter, NBAAdapter, MLSAdapter, FIFAWorldCupAdapter
from app.services.data_pipeline.icc import ICCMensT20Adapter, ICCWomensT20Adapter
from app.services.ingest import ingest_league
from app.services.google_sync import sync_feed_to_google
from app.db import SessionLocal
from app.models import CalendarFeed, User
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _build_adapters():
    """Create fresh adapter instances each run to reset any internal cache."""
    return [
        F1Adapter(),
        IPLAdapter(),
        NFLAdapter(),
        NBAAdapter(),
        MLSAdapter(),
        FIFAWorldCupAdapter(),
        ICCMensT20Adapter(),
        ICCWomensT20Adapter(),
    ]


async def _run_all_ingestions() -> None:
    logger.info("Starting scheduled ingestion for all leagues…")
    affected_league_ids: set[int] = set()
    for adapter in _build_adapters():
        try:
            await ingest_league(adapter)
            # Track which leagues were refreshed so we can sync only relevant feeds
            db = SessionLocal()
            try:
                from app.models import League
                from sqlalchemy import select as _select
                league = db.scalar(_select(League).where(League.slug == adapter.league_slug))
                if league:
                    affected_league_ids.add(league.id)
            finally:
                db.close()
        except Exception as e:
            logger.error("Ingestion error for %s: %s", adapter.league_slug, e)
    logger.info("Ingestion complete. Syncing Google Calendars…")
    await _sync_google_calendars(affected_league_ids)
    logger.info("Google Calendar sync complete.")


async def _sync_google_calendars(affected_league_ids: set[int]) -> None:
    """Push updated events to every Google Calendar subscription that overlaps the ingested leagues."""
    db = SessionLocal()
    try:
        feeds = db.scalars(
            select(CalendarFeed).where(CalendarFeed.google_calendar_id.isnot(None))
        ).all()
        for feed in feeds:
            # Only sync feeds whose leagues were just updated
            feed_league_set = set(feed.league_ids or [])
            if not feed_league_set.intersection(affected_league_ids):
                continue
            if not feed.user_id:
                continue
            user = db.get(User, feed.user_id)
            if not user or not user.google_access_token:
                continue
            try:
                inserted = await sync_feed_to_google(feed, user, db)
                logger.info(
                    "Auto-synced feed %s for user %s: %d events",
                    feed.feed_hash[:8], user.id, inserted,
                )
            except Exception as exc:
                logger.warning(
                    "Auto-sync failed for feed %s (user %s): %s",
                    feed.feed_hash[:8], user.id, exc,
                )
    finally:
        db.close()


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
