# CalSync — Data Pipeline

## Overview

The data pipeline is responsible for fetching sports schedules and team data from external APIs and persisting them into PostgreSQL. It runs on startup and on a recurring schedule.

---

## Adapter Pattern

All league adapters extend `SportAdapter` (defined in `backend/app/services/data_pipeline/base.py`):

```python
class SportAdapter(ABC):
    league_slug: str          # must match leagues.slug in DB

    async def fetch_events(self) -> list[RawEvent]: ...   # abstract
    async def fetch_teams(self)  -> list[RawTeam]:  ...   # abstract
```

### RawEvent Fields

| Field                  | Type              | Required | Notes                                  |
|------------------------|-------------------|----------|----------------------------------------|
| external_id            | str               | ✓        | Upsert key — must be globally stable   |
| title                  | str               | ✓        |                                        |
| start_time             | datetime (tz-aware UTC) | ✓  |                                        |
| end_time               | datetime \| None  |          |                                        |
| event_type             | str \| None       |          | "match", "race", "qualifying", etc.    |
| venue                  | str \| None       |          |                                        |
| city                   | str \| None       |          |                                        |
| home_team_external_id  | str \| None       |          | Matched to Team.external_id            |
| away_team_external_id  | str \| None       |          |                                        |
| status                 | str               |          | default "scheduled"                    |
| score                  | str \| None       |          | e.g. "3-1"                             |
| broadcast_info         | str \| None       |          |                                        |
| description            | str \| None       |          |                                        |
| url                    | str \| None       |          |                                        |

### RawTeam Fields

| Field          | Type          | Required | Notes                          |
|----------------|---------------|----------|--------------------------------|
| external_id    | str           | ✓        | Upsert key                     |
| name           | str           | ✓        |                                |
| short_name     | str \| None   |          | Abbreviation, e.g. "LAL"       |
| logo_url       | str \| None   |          |                                |
| primary_color  | str \| None   |          | Hex string, e.g. "#552583"     |

---

## Adapters

### F1Adapter (`f1.py`)
- **API:** OpenF1 (`https://api.openf1.org/v1`)
- **`league_slug`:** `"formula-1"`
- **Teams:** Fetched from ESPN racing teams endpoint (OpenF1 has no teams endpoint)
- **Events:** Fetches meetings + sessions for `YEAR = 2026` in parallel. Each session (Practice, Qualifying, Sprint, Race) becomes its own `RawEvent`.
- **Event ID format:** `f"openf1-{session_key}"`
- **Event title format:** `f"{gp_name} — {session_name}"` e.g. `"Australian Grand Prix — Race"`
- **Cap:** 100 events max
- **Retry:** Exponential backoff, 4 attempts (handles DNS failures at Docker cold-start)

### IPLAdapter (``)
- **API:** TheSportsDB (`https://www.thesportsdb.com/api/v1/json/3`)
- **`league_slug`:** `"ipl"`
- **League ID:** `IPL_LEAGUE_ID = "4460"` (Indian Premier League Cricket — confirmed correct)
- **Teams:** Extracted from events payload (the `lookup_all_teams` endpoint is broken on the free tier)
- **Events:** Fetches seasons `["2026", "2025"]`, deduplicates by `idEvent`
- **Status logic:** "postponed" if `strPostponed == "yes"`, "completed" if scores present, else "scheduled"
- **Known limitation:** TheSportsDB adds fixtures incrementally — early season may have fewer events

### NFLAdapter / NBAAdapter / MLSAdapter (`espn.py`)
- **API:** ESPN unofficial scoreboard API
- **Base class:** `ESPNAdapter`
- **Teams:** `GET /teams?limit=50` → walks `sports[0].leagues[0].teams[]`
- **Events:** `GET /scoreboard?dates={start}-{end}&limit=100` where start = 30 days ago and end = `days_ahead` days ahead
- **`days_ahead` values:**
  - NFL: 300 (covers full season + preseason)
  - NBA: 90 (covers playoffs through ~June)
  - MLS: 240 (covers full season + playoffs through ~Nov)
- **Cap:** 100 events max per adapter

---

## Ingest Service (`ingest.py`)

`ingest_league(adapter)` is the orchestrator called for each adapter:

1. Look up the `League` row by `adapter.league_slug` — skip if not found.
2. Call `adapter.fetch_teams()` → `_upsert_teams(db, league, raw_teams)`
3. Call `adapter.fetch_events()` → `_upsert_events(db, league, raw_events)`
4. Commit. Log success. Any exception logs an error and rolls back.

### Upsert Logic

**Teams** — matched by `(league_id, external_id)`:
- Exists: update `name`, `short_name`, `logo_url` (only if non-null), `primary_color`
- New: generate slug as `{name_lowercase_kebab}-{external_id[:8]}`, insert

**Events** — matched by `external_id` (globally unique):
- Exists: update all fields
- New: resolve `home_team_id` / `away_team_id` by looking up `Team.external_id` within the league, then insert

---

## Scheduler (`scheduler.py`)

All adapters are instantiated once at module import:
```python
ADAPTERS = [F1Adapter(), IPLAdapter(), NFLAdapter(), NBAAdapter(), MLSAdapter()]
```

`_run_all_ingestions()` iterates `ADAPTERS` sequentially and calls `ingest_league()` for each. A failure in one adapter is logged and does not stop others.

### Schedule
| Trigger | Frequency | Purpose |
|---------|-----------|---------|
| Startup (immediate) | Once | Initial data load |
| Startup (+30s delayed) | Once | Retry for DNS failures |
| `IntervalTrigger(hours=6)` | Every 6 hours | Full refresh |
| `CronTrigger(hour="12,18")` | Twice daily | Peak-time bonus refresh |

---

## Adding a New League

1. Create `backend/app/services/data_pipeline/{league}.py` extending `SportAdapter`.
2. Set `league_slug` to match a slug in the `leagues` table.
3. Implement `fetch_teams()` and `fetch_events()` returning `list[RawTeam]` and `list[RawEvent]`.
4. Add the adapter to `ADAPTERS` in `backend/app/services/scheduler.py`.
5. Add a seed entry to `backend/app/seed.py`.
6. If team logos come from a new image CDN, add the hostname to `frontend/next.config.ts` under `remotePatterns`.

---

## Event Status Values

| Value       | Meaning                                              |
|-------------|------------------------------------------------------|
| `scheduled` | Future event, not yet started                        |
| `live`      | Currently in progress (ESPN only, real-time)         |
| `completed` | Finished; scores may be available                    |
| `postponed` | Delayed; `strPostponed == "yes"` in TheSportsDB      |
| `cancelled` | Cancelled; maps to `CANCELLED` in the .ics output    |

---

## .ics Event Generation

`build_ics(events, feed_hash, reminder_minutes=None)` in `ics_generator.py`:

- `UID`: `{external_id or id}@calsync` — stable across refreshes
- `DTSTART`: `event.start_time` in UTC
- `DTEND`: `event.end_time` if set
- `DTSTAMP`: `event.updated_at` in UTC
- `SUMMARY`: title (with score appended if status is "completed")
- `DESCRIPTION`: broadcast info, URL, description
- `LOCATION`: `{venue}, {city}`
- `CATEGORIES`: `[sport_type, league_name]`
- `STATUS`: `CONFIRMED` / `TENTATIVE` (postponed) / `CANCELLED`
- `REFRESH-INTERVAL`: `PT30M` — hints to calendar clients to re-fetch every 30 minutes
- `X-WR-CALNAME`: `"CalSync — Sports Schedule"`

### VALARM (optional reminders)

When `reminder_minutes` is not `None`, a `VALARM` sub-component is embedded inside each `VEVENT`:

```ical
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder: {event.title}
TRIGGER:-PT{N}M
END:VALARM
```

- `TRIGGER` uses a relative `timedelta` (e.g. `timedelta(minutes=-30)`) as required by the `icalendar` library.
- The reminder fires N minutes before `DTSTART` in the subscriber’s calendar app.
- `reminder_minutes` is stored on the `CalendarFeed` row at creation time and used on every subsequent ICS build.
- Supported values: 15, 30, 60 (or `null` for no alarm).

The feed is cached in Redis with a 15-minute TTL (`900` seconds, `Cache-Control: public, max-age=900`).
