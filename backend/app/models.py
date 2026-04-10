import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class League(Base):
    __tablename__ = "leagues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    sport_type: Mapped[str] = mapped_column(String(30), nullable=False)
    country: Mapped[str | None] = mapped_column(String(60))
    logo_url: Mapped[str | None] = mapped_column(Text)
    data_source: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    teams: Mapped[list["Team"]] = relationship("Team", back_populates="league", cascade="all, delete-orphan")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="league", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    short_name: Mapped[str | None] = mapped_column(String(10))
    logo_url: Mapped[str | None] = mapped_column(Text)
    primary_color: Mapped[str | None] = mapped_column(String(10))  # hex
    secondary_color: Mapped[str | None] = mapped_column(String(10))
    external_id: Mapped[str | None] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("league_id", "slug", name="uq_team_league_slug"),)

    league: Mapped["League"] = relationship("League", back_populates="teams")
    home_events: Mapped[list["Event"]] = relationship(
        "Event", foreign_keys="Event.home_team_id", back_populates="home_team"
    )
    away_events: Mapped[list["Event"]] = relationship(
        "Event", foreign_keys="Event.away_team_id", back_populates="away_team"
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False, index=True)
    home_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    away_team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id", ondelete="SET NULL"))
    external_id: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    event_type: Mapped[str | None] = mapped_column(String(40))  # race, match, qualifying, etc.
    venue: Mapped[str | None] = mapped_column(String(150))
    city: Mapped[str | None] = mapped_column(String(100))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)
    score: Mapped[str | None] = mapped_column(String(30))
    broadcast_info: Mapped[str | None] = mapped_column(String(200))
    url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    league: Mapped["League"] = relationship("League", back_populates="events")
    home_team: Mapped["Team | None"] = relationship(
        "Team", foreign_keys=[home_team_id], back_populates="home_events"
    )
    away_team: Mapped["Team | None"] = relationship(
        "Team", foreign_keys=[away_team_id], back_populates="away_events"
    )


class CalendarFeed(Base):
    __tablename__ = "calendar_feeds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feed_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    league_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    team_ids: Mapped[list[int]] = mapped_column(JSON, nullable=False, default=list)
    # Optional owner for feeds created by logged-in users
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user: Mapped["User | None"] = relationship("User", back_populates="feeds")
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reminder_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    @staticmethod
    def make_hash(league_ids: list[int], team_ids: list[int]) -> str:
        """Deterministic hash so identical selections reuse the same feed."""
        key = f"l:{sorted(league_ids)}-t:{sorted(team_ids)}"
        return hashlib.sha256(key.encode()).hexdigest()[:32]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    name: Mapped[str | None] = mapped_column(String(150))
    picture_url: Mapped[str | None] = mapped_column(Text)
    google_id: Mapped[str | None] = mapped_column(String(200), unique=True)
    hashed_password: Mapped[str | None] = mapped_column(String(200))
    tier: Mapped[str] = mapped_column(String(20), default="freemium", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    feeds: Mapped[list["CalendarFeed"]] = relationship("CalendarFeed", back_populates="user")
