# CalSync — System Architecture

## Overview

CalSync is a free sports calendar sync service. Users browse leagues and teams, generate a personal `.ics` calendar feed, and subscribe to it in Google Calendar, Apple Calendar, or Outlook. The feed auto-updates as schedules change.

---

## Technology Stack

| Layer       | Technology                                              |
|-------------|---------------------------------------------------------|
| Frontend    | Next.js (App Router), TypeScript, Tailwind CSS v4       |
| Backend     | FastAPI, Python 3.12, SQLAlchemy 2, Pydantic v2         |
| Database    | PostgreSQL 16                                           |
| Cache       | Redis 7                                                 |
| Scheduling  | APScheduler (runs inside FastAPI process)               |
| Calendar    | `icalendar` Python library — RFC 5545-compliant `.ics`  |
| Orchestration | Docker Compose                                        |

---

## Directory Structure

```
calsync/
├── backend/
│   ├── app/
│   │   ├── config.py           # Pydantic Settings — reads from .env
│   │   ├── db.py               # SQLAlchemy engine + session factory
│   │   ├── main.py             # FastAPI app, lifespan handler, CORS
│   │   ├── models.py           # ORM models: League, Team, Event, CalendarFeed
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed.py             # Idempotent league row seeder
│   │   ├── routers/
│   │   │   ├── leagues.py      # GET /api/leagues, GET /api/leagues/{slug}
│   │   │   ├── events.py       # GET /api/events
│   │   │   └── feeds.py        # POST /api/feeds, GET /cal/{hash}.ics
│   │   └── services/
│   │       ├── data_pipeline/
│   │       │   ├── base.py     # Abstract SportAdapter + RawEvent/RawTeam dataclasses
│   │       │   ├── f1.py       # F1Adapter — OpenF1 API
│   │       │   ├── ipl.py      # IPLAdapter — TheSportsDB API
│   │       │   └── espn.py     # ESPNAdapter base + NFL/NBA/MLS concrete classes
│   │       ├── ingest.py       # Upserts RawTeam/RawEvent into PostgreSQL
│   │       ├── ics_generator.py # Builds RFC 5545 .ics bytes from Event rows
│   │       └── scheduler.py    # APScheduler — refresh every 6h + 12:00/18:00 UTC
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx      # Root layout: Navbar, Footer, dark theme init
│   │   │   ├── page.tsx        # Landing page / hero
│   │   │   ├── browse/         # League browser + team cards
│   │   │   └── schedule/       # Personal schedule / event list
│   │   ├── components/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── league-card.tsx
│   │   │   ├── team-card.tsx
│   │   │   ├── event-card.tsx
│   │   │   ├── calendar-link-modal.tsx  # Google/Apple/Outlook subscribe links
│   │   │   ├── sport-filter.tsx
│   │   │   └── theme-toggle.tsx
│   │   └── lib/                # API client helpers, types
│   ├── next.config.ts          # Image hostname allowlist
│   └── Dockerfile
├── docker-compose.yml
└── docs/                       # ← you are here
```

---

## Data Flow

```
External APIs          Backend                  Frontend
─────────────          ───────                  ────────
OpenF1            ──►  F1Adapter
TheSportsDB       ──►  IPLAdapter     ──►  ingest.py  ──►  PostgreSQL
ESPN              ──►  ESPNAdapter              │
                                                │  (every 6h via APScheduler)
                                                ▼
                            GET /api/leagues  ◄── Browse page
                            GET /api/events   ◄── Schedule page
                            POST /api/feeds   ◄── "Get Calendar" modal
                            GET /cal/{hash}.ics  ◄── Calendar client (polling)
                                    │
                                    ▼
                                 Redis cache (15 min TTL)
```

---

## Database Models

### `leagues`
| Column       | Type         | Notes                                     |
|--------------|--------------|-------------------------------------------|
| id           | int PK       |                                           |
| name         | varchar(100) | e.g. "Formula 1"                          |
| slug         | varchar(60)  | unique, e.g. "formula-1"                  |
| sport_type   | varchar(30)  | e.g. "motorsport", "cricket"              |
| country      | varchar(60)  |                                           |
| data_source  | varchar(50)  | e.g. "jolpica", "thesportsdb", "espn"     |
| is_active    | bool         | default true                              |

### `teams`
| Column        | Type        | Notes                                    |
|---------------|-------------|------------------------------------------|
| id            | int PK      |                                          |
| league_id     | int FK      | CASCADE delete                           |
| name          | varchar(120)|                                          |
| slug          | varchar(80) | unique per league; `{name-slug}-{ext_id[:8]}` |
| short_name    | varchar(10) | abbreviation, e.g. "LAL"                 |
| logo_url      | text        |                                          |
| primary_color | varchar(10) | hex, e.g. "#552583"                      |
| external_id   | varchar(80) | from source API                          |

### `events`
| Column              | Type        | Notes                                |
|---------------------|-------------|--------------------------------------|
| id                  | int PK      |                                      |
| league_id           | int FK      |                                      |
| external_id         | varchar(120)| unique; upsert key                   |
| title               | text        | e.g. "Australian GP — Race"          |
| event_type          | varchar(30) | "race", "match", "qualifying", etc.  |
| start_time          | timestamptz | UTC                                  |
| end_time            | timestamptz | nullable                             |
| venue               | text        |                                      |
| city                | text        |                                      |
| home_team_id        | int FK      | nullable (F1 has no home/away)       |
| away_team_id        | int FK      | nullable                             |
| status              | varchar(20) | "scheduled", "live", "completed", "postponed", "cancelled" |
| score               | varchar(20) | e.g. "3-1"                           |
| broadcast_info      | text        |                                      |
| description         | text        |                                      |
| url                 | text        |                                      |

### `calendar_feeds`
| Column          | Type          | Notes                                  |
|-----------------|---------------|----------------------------------------|
| id              | int PK        |                                        |
| feed_hash       | varchar(64)   | SHA-256 of league_ids + team_ids JSON  |
| league_ids      | JSON          | list of league.id integers             |
| team_ids        | JSON          | list of team.id integers               |
| last_accessed_at| timestamptz   | updated on each feed fetch             |

---

## Scheduler Behaviour

- **On startup**: ingestion runs immediately (first pass) and again after 30 seconds (handles DNS failures at container cold-start).
- **Recurring**: `IntervalTrigger(hours=6)` — full refresh every 6 hours.
- **Peak times**: `CronTrigger(hour="12,18", minute=0)` — extra refresh at noon and 18:00 UTC.
- All adapters run sequentially; a failure in one does not block others.

---

## Calendar Feed Lifecycle

1. User selects leagues/teams in the UI.
2. Frontend `POST /api/feeds` — body `{league_ids, team_ids}`.
3. Backend hashes the selection, creates or retrieves a `CalendarFeed` row, returns `feed_url` and `webcal_url`.
4. User clicks "Add to Google Calendar" → opens `https://calendar.google.com/calendar/r?cid={webcal_url}`.
5. On subsequent polls by the calendar client: `GET /cal/{hash}.ics` — served from Redis cache (15 min TTL), then PostgreSQL.

---

## Environment Variables (Backend)

| Variable       | Default                                     | Description             |
|----------------|---------------------------------------------|-------------------------|
| DATABASE_URL   | `postgresql://calsync:calsync@localhost:5432/calsync` | Postgres DSN   |
| REDIS_URL      | `redis://localhost:6379/0`                  | Redis connection        |
| API_BASE_URL   | `http://localhost:8000`                     | Used in feed URL generation |
| CORS_ORIGINS   | `http://localhost:3000`                     | Comma-separated origins |
| ENVIRONMENT    | `development`                               |                         |
| LOG_LEVEL      | `INFO`                                      |                         |

Redis is optional — the app falls back gracefully to no-cache mode if Redis is unavailable.
