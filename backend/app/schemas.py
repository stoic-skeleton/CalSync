from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ── League ────────────────────────────────────────────────────────────────

class LeagueBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    sport_type: str
    country: str | None
    logo_url: str | None


class LeagueList(LeagueBase):
    event_count: int = 0


class TeamBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    league_id: int
    name: str
    slug: str
    short_name: str | None
    logo_url: str | None
    primary_color: str | None


class LeagueDetail(LeagueBase):
    teams: list[TeamBase] = []


# ── Team ──────────────────────────────────────────────────────────────────

class EventLeagueSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    sport_type: str
    logo_url: str | None


class EventTeamSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    short_name: str | None
    logo_url: str | None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    league: EventLeagueSnippet
    home_team: EventTeamSnippet | None
    away_team: EventTeamSnippet | None
    title: str
    description: str | None
    venue: str | None
    city: str | None
    start_time: datetime
    end_time: datetime | None
    status: str
    broadcast_info: str | None
    score: str | None


class TeamDetail(TeamBase):
    upcoming_events: list[EventOut] = []


# ── Events ────────────────────────────────────────────────────────────────

class PaginatedEvents(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    page_size: int
    has_next: bool


# ── Feeds ─────────────────────────────────────────────────────────────────

class FeedCreateRequest(BaseModel):
    league_ids: list[int] = []
    team_ids: list[int] = []
    reminder_minutes: int | None = None


class FeedCreateResponse(BaseModel):
    feed_hash: str
    feed_url: str
    webcal_url: str
    event_count: int
