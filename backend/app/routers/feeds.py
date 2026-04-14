from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import CalendarFeed, Event, User
from app.dependencies import get_current_user, require_admin
from app.schemas import FeedCreateRequest, FeedCreateResponse, UserFeedOut
from app.config import settings
from app.services.ics_generator import build_ics
from app.services.google_sync import sync_feed_to_google

router = APIRouter(tags=["feeds"])

# Optional Redis cache — falls back gracefully if Redis is unavailable
try:
    import redis as redis_lib
    _redis = redis_lib.from_url(settings.redis_url, decode_responses=False)
    _redis.ping()
except Exception:
    _redis = None


@router.post("/api/feeds", response_model=FeedCreateResponse)
def create_feed(
    body: FeedCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a calendar feed and associate it with the authenticated user.

    Anonymous feed creation is no longer allowed; callers must be authenticated.
    Freemium users are limited to 3 feeds.
    """
    # Enforce freemium limits
    FREEMIUM_MAX_LEAGUES = 3
    FREEMIUM_MAX_FEEDS = 3
    if current_user.tier == "freemium":
        if len(body.league_ids) > FREEMIUM_MAX_LEAGUES:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan supports up to {FREEMIUM_MAX_LEAGUES} leagues per feed. Upgrade to Pro for unlimited leagues.",
            )
        existing_count = db.scalar(
            select(func.count()).select_from(CalendarFeed).where(CalendarFeed.user_id == current_user.id)
        ) or 0
        if int(existing_count) >= FREEMIUM_MAX_FEEDS:
            raise HTTPException(status_code=403, detail="Free plan limit: upgrade to Pro to create more calendar feeds.")

    feed_hash = CalendarFeed.make_hash(body.league_ids, body.team_ids)

    feed = db.scalar(select(CalendarFeed).where(CalendarFeed.feed_hash == feed_hash))
    if not feed:
        feed = CalendarFeed(
            feed_hash=feed_hash,
            league_ids=body.league_ids,
            team_ids=body.team_ids,
            reminder_minutes=body.reminder_minutes,
            user_id=current_user.id,
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

    # Pre-warm ICS cache (best-effort) so first subscriber gets a fast response
    if _redis:
        try:
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
            if body.league_ids:
                stmt = stmt.where(Event.league_id.in_(body.league_ids))
            if body.team_ids:
                stmt = stmt.where(
                    (Event.home_team_id.in_(body.team_ids)) |
                    (Event.away_team_id.in_(body.team_ids))
                )
            events = db.scalars(stmt).all()
            ics_bytes = build_ics(events, feed_hash, feed.reminder_minutes)
            _redis.setex(f"feed:{feed_hash}", 900, ics_bytes)
        except Exception:
            # best-effort pre-warm; ignore failures
            pass

    return FeedCreateResponse(
        feed_hash=feed_hash,
        feed_url=feed_url,
        webcal_url=webcal_url,
        event_count=event_count,
    )


@router.get("/api/feeds", response_model=list[UserFeedOut])
def list_my_feeds(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all feeds belonging to the authenticated user, newest first."""
    feeds = db.scalars(
        select(CalendarFeed)
        .where(CalendarFeed.user_id == current_user.id)
        .order_by(CalendarFeed.created_at.desc())
    ).all()

    now = datetime.now(timezone.utc)
    result = []
    for f in feeds:
        count_stmt = select(func.count()).select_from(Event).where(Event.start_time >= now)
        if f.league_ids:
            count_stmt = count_stmt.where(Event.league_id.in_(f.league_ids))
        if f.team_ids:
            count_stmt = count_stmt.where(
                (Event.home_team_id.in_(f.team_ids)) | (Event.away_team_id.in_(f.team_ids))
            )
        event_count = db.scalar(count_stmt) or 0
        feed_url = f"{settings.api_base_url}/cal/{f.feed_hash}.ics"
        webcal_url = feed_url.replace("http://", "webcal://").replace("https://", "webcal://")
        result.append(UserFeedOut(
            feed_hash=f.feed_hash,
            feed_url=feed_url,
            webcal_url=webcal_url,
            event_count=int(event_count),
            league_ids=f.league_ids or [],
            team_ids=f.team_ids or [],
            reminder_minutes=f.reminder_minutes,
            google_calendar_id=f.google_calendar_id,
            last_synced_at=f.last_synced_at,
            last_synced_event_count=f.last_synced_event_count,
            created_at=f.created_at,
        ))
    return result


@router.get("/cal/{feed_hash}.ics")
def serve_ics(feed_hash: str, db: Session = Depends(get_db)):
    # Try cache first
    if _redis:
        cached = _redis.get(f"feed:{feed_hash}")
        if cached:
            # Update access metrics even for cached responses (best-effort)
            try:
                feed_cached = db.scalar(select(CalendarFeed).where(CalendarFeed.feed_hash == feed_hash))
                if feed_cached:
                    now = datetime.now(timezone.utc)
                    feed_cached.last_accessed_at = now
                    feed_cached.access_count = (feed_cached.access_count or 0) + 1
                    db.commit()
            except Exception:
                pass

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

    # Update last accessed + access count
    now = datetime.now(timezone.utc)
    feed.last_accessed_at = now
    try:
        feed.access_count = (feed.access_count or 0) + 1
    except Exception:
        feed.access_count = 1
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

    ics_bytes = build_ics(events, feed_hash, feed.reminder_minutes)

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


@router.get("/api/admin/feeds")
def admin_list_feeds(db: Session = Depends(get_db), _admin = Depends(require_admin)):
    feeds = db.scalars(select(CalendarFeed).order_by(CalendarFeed.created_at.desc())).all()
    out = []
    now = datetime.now(timezone.utc)
    for f in feeds:
        # count upcoming events for this feed
        stmt = select(Event).where(Event.start_time >= now)
        if f.league_ids:
            stmt = stmt.where(Event.league_id.in_(f.league_ids))
        if f.team_ids:
            stmt = stmt.where((Event.home_team_id.in_(f.team_ids)) | (Event.away_team_id.in_(f.team_ids)))
        events = db.scalars(stmt).all()
        out.append({
            "feed_hash": f.feed_hash,
            "league_ids": f.league_ids,
            "team_ids": f.team_ids,
            "event_count": len(events),
            "access_count": f.access_count or 0,
            "last_accessed_at": f.last_accessed_at.isoformat() if f.last_accessed_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "reminder_minutes": f.reminder_minutes,
        })

    return {"items": out, "total": len(out)}


@router.post("/api/feeds/{feed_hash}/add-to-google")
async def add_feed_to_google_calendar(
    feed_hash: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sync a feed into the user's Google Calendar (creates if needed, then clears & re-inserts)."""
    if not current_user.google_id:
        raise HTTPException(status_code=400, detail="Sign in with Google to use direct calendar add.")
    if not current_user.google_access_token:
        raise HTTPException(
            status_code=403,
            detail="Google Calendar access not granted. Please sign out and sign in with Google again.",
        )

    feed = db.scalar(select(CalendarFeed).where(CalendarFeed.feed_hash == feed_hash))
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    try:
        inserted = await sync_feed_to_google(feed, current_user, db)
    except ValueError as exc:
        msg = str(exc)
        if "permission" in msg.lower() or "403" in msg:
            raise HTTPException(status_code=403, detail=msg)
        raise HTTPException(status_code=502, detail=msg)

    return {
        "ok": True,
        "message": f"{inserted} events synced to Google Calendar.",
        "google_calendar_id": feed.google_calendar_id,
        "last_synced_at": feed.last_synced_at.isoformat() if feed.last_synced_at else None,
    }

