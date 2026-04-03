"""Abstract base for all sports data adapters."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawEvent:
    external_id: str
    title: str
    start_time: datetime  # timezone-aware UTC
    end_time: datetime | None = None
    event_type: str | None = None
    venue: str | None = None
    city: str | None = None
    home_team_external_id: str | None = None
    away_team_external_id: str | None = None
    broadcast_info: str | None = None
    description: str | None = None
    url: str | None = None
    score: str | None = None
    status: str = "scheduled"


@dataclass
class RawTeam:
    external_id: str
    name: str
    short_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None


class SportAdapter(ABC):
    """Override these in each concrete adapter."""

    league_slug: str  # must match leagues.slug in DB

    @abstractmethod
    async def fetch_events(self) -> list[RawEvent]:
        """Fetch all upcoming (and recent) events."""

    @abstractmethod
    async def fetch_teams(self) -> list[RawTeam]:
        """Fetch all teams for this league."""
