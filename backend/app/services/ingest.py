"""
Ingests data from a SportAdapter into the database (upsert logic).
"""
import logging
from datetime import timezone

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import SessionLocal
from app.models import League, Team, Event
from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam

logger = logging.getLogger(__name__)


async def ingest_league(adapter: SportAdapter) -> None:
    db: Session = SessionLocal()
    try:
        league = db.scalar(select(League).where(League.slug == adapter.league_slug))
        if not league:
            logger.warning("League %s not found in DB — skipping", adapter.league_slug)
            return

        # ── Teams ──────────────────────────────────────────────────────
        try:
            raw_teams = await adapter.fetch_teams()
            _upsert_teams(db, league, raw_teams)
        except Exception as e:
            logger.error("Failed to fetch teams for %s: %s", adapter.league_slug, e)

        # ── Events ──────────────────────────────────────────────────────
        try:
            raw_events = await adapter.fetch_events()
            _upsert_events(db, league, raw_events)
        except Exception as e:
            logger.error("Failed to fetch events for %s: %s", adapter.league_slug, e)

        db.commit()
        logger.info("Ingested %s", adapter.league_slug)
    except Exception as e:
        db.rollback()
        logger.error("Ingest failed for %s: %s", adapter.league_slug, e)
    finally:
        db.close()


def _upsert_teams(db: Session, league: League, raw_teams: list[RawTeam]) -> None:
    for rt in raw_teams:
        existing = db.scalar(
            select(Team).where(Team.league_id == league.id, Team.external_id == rt.external_id)
        )
        if existing:
            existing.name = rt.name
            existing.short_name = rt.short_name
            existing.logo_url = rt.logo_url or existing.logo_url
            existing.primary_color = rt.primary_color or existing.primary_color
        else:
            slug = rt.name.lower().replace(" ", "-").replace(".", "")[:79]
            db.add(Team(
                league_id=league.id,
                name=rt.name,
                slug=f"{slug}-{rt.external_id[:8]}",
                short_name=rt.short_name,
                logo_url=rt.logo_url,
                primary_color=rt.primary_color,
                external_id=rt.external_id,
            ))


def _upsert_events(db: Session, league: League, raw_events: list[RawEvent]) -> None:
    for re in raw_events:
        existing = db.scalar(
            select(Event).where(Event.external_id == re.external_id)
        )
        home_team = _resolve_team(db, league.id, re.home_team_external_id)
        away_team = _resolve_team(db, league.id, re.away_team_external_id)

        if existing:
            existing.title = re.title
            existing.start_time = re.start_time
            existing.end_time = re.end_time
            existing.status = re.status
            existing.venue = re.venue or existing.venue
            existing.city = re.city or existing.city
            existing.score = re.score
            existing.broadcast_info = re.broadcast_info or existing.broadcast_info
            existing.home_team_id = home_team.id if home_team else existing.home_team_id
            existing.away_team_id = away_team.id if away_team else existing.away_team_id
        else:
            db.add(Event(
                league_id=league.id,
                external_id=re.external_id,
                title=re.title,
                event_type=re.event_type,
                description=re.description,
                start_time=re.start_time,
                end_time=re.end_time,
                status=re.status,
                venue=re.venue,
                city=re.city,
                home_team_id=home_team.id if home_team else None,
                away_team_id=away_team.id if away_team else None,
                broadcast_info=re.broadcast_info,
                url=re.url,
                score=re.score,
            ))


def _resolve_team(db: Session, league_id: int, external_id: str | None) -> Team | None:
    if not external_id:
        return None
    return db.scalar(
        select(Team).where(Team.league_id == league_id, Team.external_id == external_id)
    )
