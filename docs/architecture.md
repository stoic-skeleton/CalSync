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
| Auth        | JWT (httpOnly cookie + `localStorage` fallback for mobile) |
| Orchestration | Docker Compose                                        |

---

## Directory Structure

```
calsync/
├── backend/
│   ├── alembic/                # Alembic migration framework
│   │   ├── env.py              # Migration entrypoint — reads DATABASE_URL
│   │   └── versions/           # Revision scripts (one per schema change)
│   ├── alembic.ini             # Alembic config (script_location = alembic)
│   ├── app/
│   │   ├── config.py           # Pydantic Settings — reads from .env
│   │   ├── db.py               # SQLAlchemy engine + session factory
│   │   ├── main.py             # FastAPI app, lifespan handler, CORS
│   │   ├── models.py           # ORM models: League, Team, Event, CalendarFeed
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── seed.py             # Idempotent league row seeder
│   │   ├── routers/
│   │   │   ├── leagues.py      # GET /api/leagues, GET /api/leagues/{slug}
│   │   │   ├── events.py       # GET /api/events, GET /api/events/upcoming
│   │   │   └── feeds.py        # POST /api/feeds, GET /cal/{hash}.ics, GET /api/admin/feeds
│   │   └── services/
│   │       ├── data_pipeline/
│   │       │   ├── base.py     # Abstract SportAdapter + RawEvent/RawTeam dataclasses
│   │       │   ├── f1.py       # F1Adapter — OpenF1 API
│   │       │   ├── ipl.py      # IPLAdapter — CricAPI
│   │       │   ├── icc.py      # ICCMensT20Adapter + ICCWomensT20Adapter — CricAPI
│   │       │   └── espn.py     # ESPNAdapter base + NFL/NBA/MLS/PremierLeague classes
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
│   │   │   ├── sport-filter.tsx         # LogoImage helper uses native <img>
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── auth-provider.tsx        # JWT auth context; localStorage fallback
│   │   │   └── calendar/
│   │   │       ├── MonthCalendar.tsx    # Month grid with navigation + event dots
│   │   │       ├── WeekStrip.tsx        # Horizontal week strip (mobile)
│   │   │       └── EventList.tsx        # Event list for a selected date
│   │   └── lib/                # API client helpers, types
│   ├── next.config.ts          # Image hostname allowlist
│   └── Dockerfile
├── docker-compose.yml
└── docs/                       # ← you are here
```

---

## Data Flow

```
External APIs          Backend                        Frontend
─────────────          ───────                        ────────
OpenF1            ──►  F1Adapter
CricAPI           ──►  IPLAdapter         ──►  ingest.py  ──►  PostgreSQL
CricAPI           ──►  ICCMensT20Adapter          │
CricAPI           ──►  ICCWomensT20Adapter         │
ESPN              ──►  ESPNAdapter (NFL/NBA/MLS)   │  (every 6h via APScheduler)
                                                   ▼
                        GET /api/leagues  ◄─── Browse page
                        GET /api/teams    ◄─── League detail / team filter
                        GET /api/events   ◄─── Schedule page (list + calendar view)
                        POST /api/feeds   ◄─── Get Calendar page
                              │  (pre-warms Redis cache immediately)
                              ▼
                        GET /cal/{hash}.ics  ◄── Calendar client (polling)
                              │
                              ▼
                         Redis cache (15 min TTL)
                              │ (miss)
                              ▼
                         PostgreSQL → ics_generator → VALARM injection

                        GET /api/admin/feeds  ◄── Internal analytics
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
| Column           | Type          | Notes                                                        |
|------------------|---------------|--------------------------------------------------------------|
| id               | int PK        |                                                              |
| feed_hash        | varchar(64)   | First 32 chars of SHA-256(sorted league_ids + team_ids)      |
| league_ids       | JSON          | list of league.id integers                                   |
| team_ids         | JSON          | list of team.id integers                                     |
| reminder_minutes | int \| null   | Chosen at feed creation: null / 15 / 30 / 60                 |
| access_count     | int           | Incremented on every `GET /cal/{hash}.ics` request           |
| created_at       | timestamptz   | Feed creation timestamp                                      |
| last_accessed_at | timestamptz   | Updated on every ICS fetch (including cached responses)      |

---

## Scheduler Behaviour

- **On startup**: ingestion runs immediately (first pass) and again after 30 seconds (handles DNS failures at container cold-start).
- **Recurring**: `IntervalTrigger(hours=6)` — full refresh every 6 hours.
- **Peak times**: `CronTrigger(hour="12,18", minute=0)` — extra refresh at noon and 18:00 UTC.
- All adapters run sequentially; a failure in one does not block others.

---

## Calendar Feed Lifecycle

1. **Browse** — User visits `/browse`, selects leagues and/or individual teams.
2. **Configure** — `/get-calendar?leagues=1,2&teams=3` loads a summary of selections plus a reminder selector (None / 15m / 30m / 60m before each event).
3. **Generate** — User clicks *Generate Calendar Link*. Frontend `POST /api/feeds` with body `{league_ids, team_ids, reminder_minutes}`.
4. **Feed creation** — Backend hashes the selection → creates or retrieves a `CalendarFeed` row (stores `reminder_minutes`) → pre-builds and caches the `.ics` in Redis (so the first subscriber gets a fast response). Returns `feed_url`, `webcal_url`, `event_count`.
5. **Subscribe** — Modal shows the feed URL + one-click buttons for Google Calendar, Apple Calendar, and Outlook. User clicks a button and the calendar app subscribes to the webcal URL.
6. **ICS delivery** — Calendar client polls `GET /cal/{hash}.ics`. Response served from Redis if cached; on cache miss: query PostgreSQL → build ICS → inject `VALARM` per event if `reminder_minutes` is set → cache result. `access_count` is incremented on every request.
7. **Auto-refresh** — Backend ingests fresh schedules every 6 hours. Calendar clients re-poll every 15–30 minutes (set via `REFRESH-INTERVAL` in the ICS). Users automatically see updated kickoff times, cancellations, etc.
8. **Reminders** — Calendar apps honour the embedded `VALARM` components. Users receive a notification N minutes before each event with no further action required.

---

## Environment Variables (Backend)

| Variable             | Default                                     | Description             |
|----------------------|---------------------------------------------|-------------------------|
| DATABASE_URL         | `postgresql://calsync:calsync@localhost:5432/calsync` | Postgres DSN   |
| REDIS_URL            | `redis://localhost:6379/0`                  | Redis connection        |
| API_BASE_URL         | `http://localhost:8000`                     | Used in feed URL generation |
| CORS_ORIGINS         | `http://localhost:3000`                     | Comma-separated origins |
| ENVIRONMENT          | `development`                               |                         |
| LOG_LEVEL            | `INFO`                                      |                         |
| SECRET_KEY           | *(required in production)*                  | JWT signing key         |
| JWT_EXPIRE_MINUTES   | `10080` (7 days)                            | JWT token lifetime      |
| CRICAPI_KEY          | *(required for IPL + ICC)*                  | CricAPI key from cricapi.com |
| GOOGLE_CLIENT_ID     | *(optional)*                                | Google OAuth client ID  |
| GOOGLE_CLIENT_SECRET | *(optional)*                                | Google OAuth client secret |

Redis is optional — the app falls back gracefully to no-cache mode if Redis is unavailable.
