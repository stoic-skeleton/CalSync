"""
Shared Google Calendar sync logic.

Used by:
  - POST /api/feeds/{hash}/add-to-google  (manual, user-triggered)
  - scheduler._run_all_ingestions()        (automatic, post-ingest)
"""
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import CalendarFeed, Event, League, User

logger = logging.getLogger(__name__)


async def _refresh_access_token(client: httpx.AsyncClient, user: User, db: Session) -> str:
    """Exchange the stored refresh token for a new access token and persist it."""
    if not user.google_refresh_token:
        raise ValueError("No refresh token stored for user")
    r = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
            "refresh_token": user.google_refresh_token,
        },
        timeout=10,
    )
    if r.status_code != 200:
        raise ValueError(f"Token refresh failed: {r.status_code} {r.text}")
    new_token = r.json().get("access_token")
    if not new_token:
        raise ValueError("Token refresh returned no access_token")
    user.google_access_token = new_token
    db.add(user)
    db.commit()
    return new_token


async def _gcal_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    token: str,
    user: User,
    db: Session,
    **kwargs,
) -> httpx.Response:
    """Make a Google Calendar API request, auto-refreshing on 401."""
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = await client.request(method, url, headers=headers, **kwargs)
    if r.status_code == 401:
        token = await _refresh_access_token(client, user, db)
        headers["Authorization"] = f"Bearer {token}"
        r = await client.request(method, url, headers=headers, **kwargs)
    return r


async def sync_feed_to_google(
    feed: CalendarFeed,
    user: User,
    db: Session,
) -> int:
    """
    Sync a CalendarFeed to the user's Google Calendar.

    Strategy: delete all existing events in the Google Calendar, then re-insert
    current upcoming events from our DB. Creates the calendar if it doesn't exist yet.

    Returns the number of events inserted.
    Raises ValueError on unrecoverable errors (missing token, permission denied).
    """
    token = user.google_access_token
    if not token:
        raise ValueError("No Google access token for user")

    async with httpx.AsyncClient(timeout=30) as client:
        # ── 1. Get or create the Google Calendar ──────────────────────
        gcal_id = feed.google_calendar_id
        if not gcal_id:
            league_names = list(
                db.scalars(select(League.name).where(League.id.in_(feed.league_ids or [])))
            )
            cal_summary = " · ".join(league_names) + " · CalSync" if league_names else "CalSync"

            r = await _gcal_request(
                client, "POST",
                "https://www.googleapis.com/calendar/v3/calendars",
                token, user, db,
                json={"summary": cal_summary, "timeZone": "UTC"},
            )
            if r.status_code == 403:
                raise ValueError(
                    "Calendar permission not granted. Please sign out and sign in with Google again."
                )
            if r.status_code not in (200, 201):
                raise ValueError(f"Failed to create Google Calendar: {r.status_code}")

            gcal_id = r.json()["id"]
            feed.google_calendar_id = gcal_id
            db.add(feed)
            db.commit()
            # refresh token may have changed above — use latest
            token = user.google_access_token

        # ── 2. Delete all existing events (clean slate) ───────────────
        # List and delete in pages to handle large calendars
        page_token: str | None = None
        event_ids_to_delete: list[str] = []
        while True:
            params: dict = {"maxResults": 250, "singleEvents": "true"}
            if page_token:
                params["pageToken"] = page_token
            r = await _gcal_request(
                client, "GET",
                f"https://www.googleapis.com/calendar/v3/calendars/{gcal_id}/events",
                token, user, db,
                params=params,
            )
            if r.status_code == 404:
                # Calendar was deleted externally — recreate on next call
                feed.google_calendar_id = None
                db.add(feed)
                db.commit()
                raise ValueError("Google Calendar not found — cleared ID, please sync again.")
            if r.status_code not in (200, 201):
                break
            data = r.json()
            event_ids_to_delete.extend(item["id"] for item in data.get("items", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                break

        for gid in event_ids_to_delete:
            await _gcal_request(
                client, "DELETE",
                f"https://www.googleapis.com/calendar/v3/calendars/{gcal_id}/events/{gid}",
                token, user, db,
            )

        # ── 3. Fetch upcoming events from our DB ──────────────────────
        now = datetime.now(timezone.utc)
        stmt = select(Event).where(Event.start_time >= now)
        if feed.league_ids:
            stmt = stmt.where(Event.league_id.in_(feed.league_ids))
        if feed.team_ids:
            stmt = stmt.where(
                (Event.home_team_id.in_(feed.team_ids)) | (Event.away_team_id.in_(feed.team_ids))
            )
        events = db.scalars(stmt.order_by(Event.start_time)).all()

        # ── 4. Insert events ──────────────────────────────────────────
        inserted = 0
        for event in events:
            end = event.end_time or (event.start_time + timedelta(hours=2))
            body: dict = {
                "summary": event.title,
                "start": {"dateTime": event.start_time.isoformat(), "timeZone": "UTC"},
                "end":   {"dateTime": end.isoformat(), "timeZone": "UTC"},
            }
            location_parts = [p for p in [event.venue, event.city] if p]
            if location_parts:
                body["location"] = ", ".join(location_parts)
            if event.description:
                body["description"] = event.description

            er = await _gcal_request(
                client, "POST",
                f"https://www.googleapis.com/calendar/v3/calendars/{gcal_id}/events",
                token, user, db,
                json=body,
            )
            if er.status_code in (200, 201):
                inserted += 1

        # ── 5. Stamp last_synced_at ───────────────────────────────────
        feed.last_synced_at = datetime.now(timezone.utc)
        feed.last_synced_event_count = inserted
        db.add(feed)
        db.commit()

        return inserted
