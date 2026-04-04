# CalSync

> Never miss a game again.

CalSync lets you subscribe to sports schedules (F1, IPL, NFL, NBA, MLS) directly into Google Calendar, Apple Calendar, or Outlook — auto-updating `.ics` feeds, no account required.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/architecture.md](docs/architecture.md) | System overview, data flow, DB schema, env vars |
| [docs/apis.md](docs/apis.md) | External APIs, endpoints, response shapes, known quirks |
| [docs/data-pipeline.md](docs/data-pipeline.md) | Adapter pattern, ingest logic, `.ics` generation, adding leagues |
| [docs/errors-and-fixes.md](docs/errors-and-fixes.md) | Every significant error encountered and how it was fixed |
| [docs/development.md](docs/development.md) | Setup, Docker commands, DB queries, project conventions |
| [docs/deployment-railway-vercel.md](docs/deployment-railway-vercel.md) | Step-by-step: backend on Railway, frontend on Vercel |

## Quick Start

```powershell
# Start all services (Postgres + Redis + backend + frontend)
docker compose up --build

# Full reset (wipes DB and cache — required after schema changes)
docker compose down -v ; docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger UI | http://localhost:8000/docs |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Calendar | `icalendar` (RFC 5545) |
| Scheduler | APScheduler 3 (runs inside FastAPI — no separate worker) |

## Sports Covered

| League | API | Slug |
|--------|-----|------|
| Formula 1 | OpenF1 | `formula-1` |
| IPL | TheSportsDB | `ipl` |
| NFL | ESPN | `nfl` |
| NBA | ESPN | `nba` |
| MLS | ESPN | `mls` |

## Project Structure

```
calsync/
├── frontend/          # Next.js App Router
├── backend/           # FastAPI + data pipeline + .ics serving
│   └── app/
│       ├── routers/   # leagues, events, feeds
│       └── services/
│           ├── data_pipeline/  # f1.py, ipl.py, espn.py
│           ├── ingest.py
│           ├── ics_generator.py
│           └── scheduler.py
├── docs/              # Architecture, APIs, errors, dev guide
└── docker-compose.yml
```

## License

MIT
