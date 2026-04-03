# CalSync — Known Errors and Fixes

This document records every significant error encountered during development, its root cause, and the resolution applied. Consult this before debugging recurring issues.

---

## Frontend

### ❌ `Invalid src prop` on `next/image`

**Error:**
```
Error: Invalid src prop (https://r2.thesportsdb.com/images/media/team/badge/...) on `next/image`,
hostname "r2.thesportsdb.com" is not configured under `images` in your `next.config.js`
```

**Cause:** `next/image` requires all external image hostnames to be explicitly allowlisted.

**Fix:** Added to `frontend/next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.thesportsdb.com" },
      { protocol: "https", hostname: "**.espncdn.com" },
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "a1.espncdn.com" },
      { protocol: "https", hostname: "a2.espncdn.com" },
      { protocol: "https", hostname: "a4.espncdn.com" },
      { protocol: "https", hostname: "**.jolpica.com" },
      { protocol: "https", hostname: "**.formula1.com" },
    ],
  },
};
```

**Rule:** Any time a new sports API is added whose images will be rendered via `next/image`, add its CDN hostname(s) to this list.

---

### ❌ Layout — No gaps, wrong font, page doesn't fill height

**Symptoms:** No spacing between elements, Tailwind font variables not applying, footer not sticking to bottom.

**Cause:** Tailwind CSS v4 uses `@theme inline` which caused a CSS variable conflict, overriding custom font variables.

**Fix:** Updated `globals.css` to correctly define CSS custom properties in a way compatible with Tailwind v4's `@theme`. Made `body` use `min-h-screen flex flex-col` and `main` use `flex-1 flex flex-col`.

---

### ❌ Schedule tab shows 0 events

**Cause:** Either (a) backend ingestion had not completed before the frontend made its request, or (b) the events API filter was too strict (`start_time >= now` with no grace period or the DB was empty).

**Fix:** Backend runs two ingestion passes — immediately on startup and again after 30 seconds. The 30-second delayed pass is specifically to cover Docker container cold-start timing issues.

---

### ❌ Google Calendar shows 0 events after subscribing

**Cause:** The `.ics` feed was being generated with a future-only filter but the DB had no future events yet (ingestion hadn't completed), so an empty calendar was cached in Redis.

**Fix:** After a full `docker compose down -v` (wipes Redis + Postgres), allow 30–60 seconds after `docker compose up --build` for ingestion to complete before testing the calendar feed. Redis TTL is 15 minutes — if a stale empty cache is served, wait for it to expire or flush Redis.

**To flush Redis manually:**
```powershell
docker exec calsync-redis-1 redis-cli FLUSHALL
```

---

## Backend — Data Pipeline

### ❌ F1 adapter: DNS failures at container cold-start

**Error (backend logs):**
```
httpx.ConnectError: [Errno -2] Name or service not known
  OR
httpx.ConnectTimeout: timed out
```

**Cause:** At Docker container startup, DNS resolution for external APIs may not be ready. The first ingestion attempt (fired immediately at startup) fails.

**Fix:**
1. The scheduler fires a second ingestion pass after 30 seconds (`_delayed_ingestion(30)` in `main.py`).
2. The F1 adapter (`f1.py`) uses `_get_with_retry()` with exponential backoff (4 attempts: 1s, 2s, 4s, 8s).

---

### ❌ F1 adapter: Jolpica API returning errors / inconsistent data

**Symptoms:** F1 backend logs showed errors on every ingestion. Only 1 upcoming F1 event visible.

**Root causes:**
1. Jolpica API had DNS resolution issues at Docker cold-start.
2. Response structure required fragile nested key traversal: `data["MRData"]["RaceTable"]["Races"]`.
3. Some race entries were missing `"time"` fields → `KeyError`.
4. Sprint weekends include `"Sprint"` / `"SprintQualifying"` keys; non-sprint rounds do not → another source of `KeyError`.

**Fix:** Migrated from the Jolpica/Ergast API to the **OpenF1 API** (`api.openf1.org`). OpenF1:
- Is purpose-built for F1 open data
- Returns richer session data (exact start/end times per session)
- Has more reliable uptime
- Returns clean ISO 8601 datetimes parseable directly with `datetime.fromisoformat()`

**Do not re-introduce Jolpica.** See `docs/apis.md` for the Jolpica deprecation note.

---

### ❌ IPL showing wrong teams (football teams instead of cricket)

**Cause:** Wrong `IPL_LEAGUE_ID` was used. The `lookup_all_teams` endpoint on TheSportsDB's free tier (`/3/`) ignores the `id` parameter and returns whatever it wants. Earlier attempts used league IDs `4792` and `4452` — both wrong.

**Fix:**
1. Correct league ID is **`4460`** — verified via the `search_all_leagues` endpoint.
2. Teams are **not** fetched from `lookup_all_teams`. Instead, they are extracted from the events payload, which correctly carries `idHomeTeam`, `strHomeTeam`, `strHomeTeamBadge`, etc.

**To verify the correct league ID:**
```
GET https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?s=cricket&c=India
```

---

### ❌ IPL only returning 9 upcoming events

**Cause:** TheSportsDB adds IPL fixtures incrementally as the tournament schedule is confirmed. Early in the season (or before the season is announced), only the first few rounds are available.

**Partial fix:** Fetching both `"2026"` and `"2025"` seasons simultaneously and deduplicating by `idEvent` maximises event coverage.

**Limitation:** This is an upstream data availability issue and cannot be fully resolved without switching to a different API (e.g. CricAPI, Cricbuzz). If IPL data remains thin, consider hardcoding the IPL 2025/2026 schedule as a static fallback.

---

### ❌ `League not found in DB — skipping` (backend log warning)

**Cause:** An adapter's `league_slug` does not match any row in the `leagues` table. This happens after `docker compose down -v` wipes the database before the seed has run.

**Fix:** The `seed()` function in `seed.py` is called during the FastAPI lifespan before ingestion starts. It is idempotent — safe to run multiple times.

If a league is missing, check:
1. The `leagues` table in Postgres: `SELECT slug FROM leagues;`
2. The `seed.py` file has an entry for the league.
3. The adapter's `league_slug` matches exactly (case-sensitive).

---

### ❌ Docker Compose YAML: duplicate service block keys

**Cause:** During scaffolding, a service (e.g. `backend`) was defined twice in `docker-compose.yml`. Docker Compose silently uses the last definition.

**Fix:** Removed duplicate blocks. Validate with `docker compose config` which will flag duplicates.

---

## Docker / Infrastructure

### ❌ Old stale data after code changes

**Symptom:** Backend changes not reflected despite rebuild.

**Fix — full wipe and rebuild:**
```powershell
docker compose down -v
docker compose up --build
```

The `-v` flag removes named volumes (`postgres_data`, `redis_data`), forcing the DB to be recreated and re-seeded from scratch. Required after any schema change.

**Note:** After a full wipe, wait ~30–60 seconds for ingestion to complete before testing the frontend.

---

### ❌ Backend container exits immediately / `exit code 1`

**Causes and checks:**
1. **Python import error** — check `docker logs calsync-backend-1` for a `ModuleNotFoundError` or `SyntaxError`.
2. **DB not ready** — the `depends_on` health check should prevent this, but if Postgres takes too long, the backend may start before it's ready. Retry `docker compose up`.
3. **Port already in use** — check if something else is using port 8000: `netstat -ano | findstr :8000`.

---

## Debugging Commands

### Check backend logs (last 50 lines):
```powershell
docker logs calsync-backend-1 --tail 50
```

### Follow backend logs live:
```powershell
docker logs calsync-backend-1 -f
```

### Query the DB directly:
```powershell
docker exec -it calsync-postgres-1 psql -U calsync -d calsync -c "SELECT COUNT(*) FROM events;"
docker exec -it calsync-postgres-1 psql -U calsync -d calsync -c "SELECT slug FROM leagues;"
```

### Flush Redis cache:
```powershell
docker exec calsync-redis-1 redis-cli FLUSHALL
```

### Validate Docker Compose config (check for duplicates):
```powershell
docker compose config
```

### Check all running containers:
```powershell
docker compose ps
```
