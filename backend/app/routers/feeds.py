from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import CalendarFeed, Event
from app.schemas import FeedCreateRequest, FeedCreateResponse
from app.config import settings
from app.services.ics_generator import build_ics

router = APIRouter(tags=["feeds"])

# Optional Redis cache — falls back gracefully if Redis is unavailable
try:
    import redis as redis_lib
    _redis = redis_lib.from_url(settings.redis_url, decode_responses=False)
    _redis.ping()
except Exception:
    _redis = None


@router.post("/api/feeds", response_model=FeedCreateResponse)
def create_feed(body: FeedCreateRequest, db: Session = Depends(get_db)):
    feed_hash = CalendarFeed.make_hash(body.league_ids, body.team_ids)

    feed = db.scalar(select(CalendarFeed).where(CalendarFeed.feed_hash == feed_hash))
    if not feed:
        feed = CalendarFeed(
            feed_hash=feed_hash,
            league_ids=body.league_ids,
            team_ids=body.team_ids,
        )
        db.add(feed)
        db.commit()
        db.refresh(feed)

    # Count upcoming events
    now = datetime.now(timezone.utc)
    count_stmt = select(Event).where(Event.start_time >= now)
    if body.league_ids:
        count_stmt = count_stmt.where(Event.league_id.in_(body.league_ids))
    events = db.scalars(count_stmt).all()
    event_count = len(events)

    feed_url = f"{settings.api_base_url}/cal/{feed_hash}.ics"
    webcal_url = feed_url.replace("http://", "webcal://").replace("https://", "webcal://")

    return FeedCreateResponse(
        feed_hash=feed_hash,
        feed_url=feed_url,
        webcal_url=webcal_url,
        event_count=event_count,
    )


@router.get("/cal/{feed_hash}.ics")
def serve_ics(feed_hash: str, db: Session = Depends(get_db)):
    # Try cache first
    if _redis:
        cached = _redis.get(f"feed:{feed_hash}")
        if cached:
            return Response(
                content=cached,
                media_type="text/calendar; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="calsync-{feed_hash[:8]}.ics"',
                    "Cache-Control": "public, max-age=900",
                },
            )

    feed = db.scalar(select(CalendarFeed).where(CalendarFeed.feed_hash == feed_hash))
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    # Update last accessed
    feed.last_accessed_at = datetime.now(timezone.utc)
    db.commit()

    # Fetch matching events
    now = datetime.now(timezone.utc)
    stmt = (
        select(Event)
        .where(Event.start_time >= now)
        .options(
            joinedload(Event.league),
            joinedload(Event.home_team),
            joinedload(Event.away_team),
        )
        .order_by(Event.start_time)
    )
    if feed.league_ids:
        stmt = stmt.where(Event.league_id.in_(feed.league_ids))
    if feed.team_ids:
        stmt = stmt.where(
            (Event.home_team_id.in_(feed.team_ids)) |
            (Event.away_team_id.in_(feed.team_ids))
        )
    events = db.scalars(stmt).all()

    ics_bytes = build_ics(events, feed_hash)

    # Cache for 15 minutes
    if _redis:
        _redis.setex(f"feed:{feed_hash}", 900, ics_bytes)

    return Response(
        content=ics_bytes,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="calsync-{feed_hash[:8]}.ics"',
            "Cache-Control": "public, max-age=900",
        },
    )
