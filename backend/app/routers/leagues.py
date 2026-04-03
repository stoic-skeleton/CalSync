from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import League, Event
from app.schemas import LeagueList, LeagueDetail

router = APIRouter(prefix="/api/leagues", tags=["leagues"])


@router.get("", response_model=list[LeagueList])
def list_leagues(
    sport: str | None = Query(None, description="Filter by sport_type"),
    db: Session = Depends(get_db),
):
    stmt = select(League).where(League.is_active == True)  # noqa: E712
    if sport:
        stmt = stmt.where(League.sport_type == sport)
    stmt = stmt.order_by(League.name)
    leagues = db.scalars(stmt).all()

    # Attach upcoming event counts
    now = datetime.now(timezone.utc)
    counts: dict[int, int] = dict(
        db.execute(
            select(Event.league_id, func.count(Event.id))
            .where(Event.start_time >= now)
            .group_by(Event.league_id)
        ).all()
    )

    result = []
    for lg in leagues:
        out = LeagueList.model_validate(lg)
        out.event_count = counts.get(lg.id, 0)
        result.append(out)
    return result


@router.get("/{slug}", response_model=LeagueDetail)
def get_league(slug: str, db: Session = Depends(get_db)):
    league = db.scalar(
        select(League)
        .where(League.slug == slug, League.is_active == True)  # noqa: E712
        .options(joinedload(League.teams))
    )
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league
