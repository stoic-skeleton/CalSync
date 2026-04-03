from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import Event, League, Team
from app.schemas import EventOut, PaginatedEvents

router = APIRouter(prefix="/api/events", tags=["events"])


def _event_with_relations(db: Session, stmt):
    return db.scalars(
        stmt.options(
            joinedload(Event.league),
            joinedload(Event.home_team),
            joinedload(Event.away_team),
        )
    ).all()


@router.get("/upcoming", response_model=list[EventOut])
def upcoming_events(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = (
        select(Event)
        .where(Event.start_time >= now, Event.status != "cancelled")
        .order_by(Event.start_time)
        .limit(limit)
    )
    return _event_with_relations(db, stmt)


@router.get("", response_model=PaginatedEvents)
def list_events(
    league: str | None = Query(None),
    team: str | None = Query(None),
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = select(Event).where(Event.start_time >= (from_ or now))

    if league:
        league_obj = db.scalar(select(League).where(League.slug == league))
        if league_obj:
            stmt = stmt.where(Event.league_id == league_obj.id)

    if team:
        team_obj = db.scalar(select(Team).where(Team.slug == team))
        if team_obj:
            stmt = stmt.where(
                (Event.home_team_id == team_obj.id) | (Event.away_team_id == team_obj.id)
            )

    if to:
        stmt = stmt.where(Event.start_time <= to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = _event_with_relations(
        db,
        stmt.order_by(Event.start_time)
            .offset((page - 1) * page_size)
            .limit(page_size),
    )

    return PaginatedEvents(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
        has_next=(page * page_size) < (total or 0),
    )
