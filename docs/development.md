# CalSync — Development Guide

## Prerequisites

- Docker Desktop (with Compose v2)
- Node.js 20+ (for frontend development outside Docker)
- Python 3.12+ with `uv` (for backend development outside Docker)
- PowerShell (Windows)

---

## Running the Full Stack (Docker)

### Start everything (first time or after changes):
```powershell
docker compose up --build
```

### Start after a schema change or to reset all data:
```powershell
docker compose down -v
docker compose up --build
```

**The `-v` flag** removes named volumes — this wipes the PostgreSQL database and Redis cache. Required whenever:
- The database schema changes
- You want a clean slate for testing ingestion
- Seeds need to re-run from scratch

### Stop without wiping data:
```powershell
docker compose down
```

### Services and Ports

| Service   | Port  | URL                                |
|-----------|-------|------------------------------------|
| Frontend  | 3000  | http://localhost:3000              |
| Backend   | 8000  | http://localhost:8000              |
| Postgres  | 5432  | `postgresql://calsync:calsync@localhost:5432/calsync` |
| Redis     | 6379  | `redis://localhost:6379/0`         |

### API Docs (Swagger UI):
http://localhost:8000/docs

### Health check:
```
GET http://localhost:8000/api/health
```

---

## Backend Development

### Tech stack
- Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2
- APScheduler (runs inside FastAPI process — no separate worker)
- `icalendar` for RFC 5545 .ics generation
- `httpx` for async HTTP requests

### Local setup (without Docker):
```powershell
cd backend
uv pip install -r requirements.txt   # or: uv pip install -e ".[dev]"
```

**Never use `pip install` directly — always use `uv`.**

### Run backend locally (requires Postgres + Redis running separately):
```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Environment variables
Copy `backend/.env.example` to `backend/.env` and fill in values. In Docker, env vars are set directly in `docker-compose.yml`.

| Variable       | Example value                                       |
|----------------|-----------------------------------------------------|
| DATABASE_URL   | `postgresql://calsync:calsync@localhost:5432/calsync` |
| REDIS_URL      | `redis://localhost:6379/0`                          |
| API_BASE_URL   | `http://localhost:8000`                             |
| CORS_ORIGINS   | `http://localhost:3000`                             |
| ENVIRONMENT    | `development`                                       |
| LOG_LEVEL      | `INFO`                                              |

### Run tests:
```powershell
cd backend
pytest tests/ -v
```

### Lint / type-check:
```powershell
cd backend
ruff check app/
mypy app/
```

---

## Frontend Development

### Tech stack
- Next.js 15+ (App Router), TypeScript, Tailwind CSS v4
- Geist font (Google Fonts)
- Dark/light theme stored in `localStorage` as `calsync-theme`

### Local setup (without Docker):
```powershell
cd frontend
npm install
```

### Run dev server:
```powershell
cd frontend
npm run dev
```

### Environment variables
Copy `frontend/.env.local.example` to `frontend/.env.local`.

| Variable              | Example value             |
|-----------------------|---------------------------|
| NEXT_PUBLIC_API_URL   | `http://localhost:8000`   |

### Build for production:
```powershell
cd frontend
npm run build
npm start
```

### Important: Adding external image hostnames

Whenever a new API is introduced that serves images rendered by `next/image`, add the CDN hostname to `frontend/next.config.ts`:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "your-new-cdn.com" },
  ],
},
```

Failure to do this causes a runtime error: `Invalid src prop ... hostname not configured`.

---

## Database

### Direct access via Docker:
```powershell
docker exec -it calsync-postgres-1 psql -U calsync -d calsync
```

### Useful queries:
```sql
-- Count events per league
SELECT l.name, COUNT(e.id) as event_count
FROM leagues l
LEFT JOIN events e ON e.league_id = l.id
GROUP BY l.name;

-- Upcoming events
SELECT title, start_time, status
FROM events
WHERE start_time >= NOW()
ORDER BY start_time
LIMIT 20;

-- All leagues
SELECT id, name, slug, sport_type, data_source FROM leagues;

-- All teams for a league
SELECT t.name, t.external_id, t.logo_url
FROM teams t
JOIN leagues l ON t.league_id = l.id
WHERE l.slug = 'formula-1';
```

### Schema migrations
The app runs `Base.metadata.create_all()` at startup (idempotent, creates tables if missing). For production schema migrations, use Alembic (already a dependency in `pyproject.toml`).

---

## Debugging Ingestion

### Check what's in the DB after startup:
```powershell
docker exec -it calsync-postgres-1 psql -U calsync -d calsync -c "SELECT l.name, COUNT(e.id) FROM leagues l LEFT JOIN events e ON e.league_id = l.id GROUP BY l.name;"
```

### Follow backend logs to watch ingestion:
```powershell
docker logs calsync-backend-1 -f
```

Expected log output during healthy ingestion:
```
INFO:app.services.scheduler:Starting scheduled ingestion for all leagues…
INFO:app.services.ingest:Ingested formula-1
INFO:app.services.ingest:Ingested ipl
INFO:app.services.ingest:Ingested nfl
INFO:app.services.ingest:Ingested nba
INFO:app.services.ingest:Ingested mls
INFO:app.services.scheduler:Ingestion complete.
```

### Manually trigger ingestion via API (if a debug endpoint is added):
```
POST http://localhost:8000/api/admin/ingest
```
(This endpoint doesn't exist by default — add it to `main.py` if needed during development.)

### Flush Redis to force .ics regeneration:
```powershell
docker exec calsync-redis-1 redis-cli FLUSHALL
```

---

## Project Conventions

### Backend
- All adapter `external_id` values must be globally unique strings that are stable across fetches (i.e., IDs from the source API, not derived from position/index).
- All `start_time` values must be timezone-aware UTC `datetime` objects. Never store naive datetimes.
- Adapters must be forgiving: use `.get()` with defaults, wrap date parsing in `try/except`, and return an empty list on total failure rather than raising.
- The `logger.error()` pattern (not raising exceptions) is used throughout `ingest.py` so one failing adapter never blocks others.

### Frontend
- Theme preference is stored in `localStorage` as `"calsync-theme"` with values `"dark"` or `"light"`. The `<script>` tag in `layout.tsx` reads this before first paint to avoid flash.
- API calls go to `NEXT_PUBLIC_API_URL` (set in `.env.local` or injected by Docker).

---

## Leagues Reference

| League Name | Slug        | Sport Type        | Data Source    | Season Notes         |
|-------------|-------------|-------------------|----------------|----------------------|
| Formula 1   | formula-1   | motorsport        | openf1         | Year = 2026 (update each season) |
| IPL         | ipl         | cricket           | thesportsdb    | League ID = 4460     |
| NFL         | nfl         | american_football | espn           | days_ahead = 300     |
| NBA         | nba         | basketball        | espn           | days_ahead = 90      |
| MLS         | mls         | soccer            | espn           | days_ahead = 240     |

To update the F1 season year, change `YEAR = 2026` in `backend/app/services/data_pipeline/f1.py`.
