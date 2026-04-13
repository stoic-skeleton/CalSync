# CalSync — External APIs Reference

## Summary Table

| League    | API Name         | Base URL                                                | Auth     | Cost |
|-----------|------------------|---------------------------------------------------------|----------|------|
| Formula 1 | OpenF1           | `https://api.openf1.org/v1`                             | None     | Free |
| F1 Teams  | ESPN (fallback)  | `https://site.api.espn.com/apis/site/v2/sports/racing/f1` | None  | Free |
| IPL       | CricAPI          | `https://api.cricapi.com/v1`                            | API key  | Free (100 calls/day) |
| ICC Men's T20 WC | CricAPI | `https://api.cricapi.com/v1`                           | API key  | Free (shared with IPL) |
| ICC Women's T20 WC | CricAPI | `https://api.cricapi.com/v1`                        | API key  | Free (shared with IPL) |
| Premier League | ESPN (unofficial) | `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1` | None | Free |
| NFL       | ESPN (unofficial)| `https://site.api.espn.com/apis/site/v2/sports/football/nfl` | None | Free |
| NBA       | ESPN (unofficial)| `https://site.api.espn.com/apis/site/v2/sports/basketball/nba` | None | Free |
| MLS       | ESPN (unofficial)| `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1` | None | Free |

---

## Formula 1 — OpenF1 API

**Docs:** https://openf1.org  
**Base:** `https://api.openf1.org/v1`  
**Auth:** None required.

### Endpoints Used

#### `GET /meetings?year={YEAR}`
Returns a list of GP meeting weekends.

**Key response fields:**
```json
{
  "meeting_key": 1217,
  "meeting_name": "Australian Grand Prix",
  "circuit_short_name": "Melbourne",
  "location": "Melbourne",
  "country_name": "Australia",
  "date_start": "2025-03-14T01:30:00+00:00"
}
```

**Filter:** Exclude entries where `meeting_name` contains `"testing"` (pre-season test entries).

#### `GET /sessions?year={YEAR}`
Returns all individual sessions (Practice 1/2/3, Qualifying, Sprint, Sprint Qualifying, Race) across all meetings.

**Key response fields:**
```json
{
  "session_key": 9161,
  "meeting_key": 1217,
  "session_name": "Race",
  "session_type": "Race",
  "date_start": "2025-03-16T05:00:00+00:00",
  "date_end": "2025-03-16T07:00:00+00:00"
}
```

**Session types surfaced as calendar events:**
`{"Practice", "Qualifying", "Sprint", "Sprint Qualifying", "Race"}`

### Notes
- Previous implementation used the Jolpica/Ergast API (`api.jolpi.ca/ergast/f1/`) — **migrated away** due to reliability issues at Docker container cold-start (DNS resolution failures, rate limiting).
- OpenF1 is the official open data API for F1 and is more reliable.
- `date_start` / `date_end` are ISO 8601 with timezone offset — parse with `datetime.fromisoformat()` directly.
- Sprint weekends have `"Sprint"` and `"Sprint Qualifying"` sessions; non-sprint rounds do not.
- The adapter fetches meetings and sessions **in parallel** using `asyncio.gather()`.
- F1 teams are fetched from the ESPN racing endpoint because OpenF1 has no teams/constructors endpoint.

### Retry Logic
The adapter uses exponential backoff (`_get_with_retry`) with 4 attempts and delays of 1s, 2s, 4s, 8s. This handles transient failures at container startup when DNS may not yet be ready.

---

## IPL / ICC — CricAPI

**Docs:** https://cricapi.com/cricapi/apis/  
**Base:** `https://api.cricapi.com/v1`  
**Auth:** API key passed as `?apikey=KEY` query param. Set `CRICAPI_KEY` in environment.

**Free tier limits:** 100 calls/day. The IPL and both ICC adapters share this quota.

### Series IDs (update each cycle)

| Series | ID | Matches |
|--------|----|--------|
| IPL 2026 | `87c62aac-bc3c-4738-ab93-19da0690488f` | 70 |
| ICC Men's T20 WC 2026 | `5978f057-af70-4dcf-b9ee-04831b8df947` | 55 |
| ICC Women's T20 WC 2026 | `f3e5c7dd-332c-4893-9067-aa2bfe6d2b85` | 33 |

To find series IDs for a new season:
```
GET https://api.cricapi.com/v1/series?apikey=KEY&search=Indian+Premier+League
GET https://api.cricapi.com/v1/series?apikey=KEY&search=ICC
```

Series IDs can also be overridden at runtime via environment variables (`ICC_MENS_T20_SERIES_ID`, `ICC_WOMENS_T20_SERIES_ID`) without a code deploy.

### Endpoints Used

#### `GET /series_info?apikey={KEY}&id={SERIES_ID}`
Returns full match list for a series.

**Key response structure:**
```json
{
  "status": "success",
  "data": {
    "info": { "name": "Indian Premier League 2026" },
    "matchList": [
      {
        "id": "abc123",
        "name": "Mumbai Indians vs Chennai Super Kings, 1st Match, Indian Premier League 2026",
        "dateTimeGMT": "2026-03-22T14:00:00",
        "teams": ["Mumbai Indians", "Chennai Super Kings"],
        "venue": "Wankhede Stadium",
        "matchStarted": false,
        "matchEnded": false
      }
    ]
  }
}
```

**Status mapping:**
| `matchEnded` | CalSync `status` |
|---|---|
| `true` | `"completed"` |
| `false` | `"scheduled"` |

### IPL Team Logos
Logo URLs are hardcoded in `_TEAM_LOGOS` in `ipl.py`, keyed by substring of team name. CDN host is `r2.thesportsdb.com`. This avoids extra API calls and bypasses the CricAPI free tier quota.

> **Note:** TheSportsDB migrated their CDN from `www.thesportsdb.com` to `r2.thesportsdb.com` in early 2026. Team badge URLs must use the `r2.` subdomain or they return 404.

### National Team Logos (ICC)
CricAPI does not provide national team badge images. ICC adapter sets `logo_url = None`; the frontend falls back to the cricket emoji via `LogoImage`'s `onError` handler.

---

## NFL / NBA / MLS — ESPN Unofficial API

**Note:** This is an undocumented public API used by ESPN's own website. It is widely used by developers and has been stable for years, but there is no official SLA or documentation.

**Base patterns:**
```
https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard
https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams
```

### League Slugs

| League | `espn_sport`   | `espn_league` | `days_ahead` |
|--------|----------------|---------------|--------------|
| NFL    | `football`     | `nfl`         | 300          |
| NBA    | `basketball`   | `nba`         | 90           |
| MLS    | `soccer`       | `usa.1`       | 240          |
| Premier League | `soccer` | `eng.1`     | 240          |

### Endpoints Used

#### `GET /scoreboard?dates={YYYYMMDD}-{YYYYMMDD}&limit=100&page={n}`
Returns games within a date range.

**Key response structure:**
```json
{
  "events": [
    {
      "id": "401547673",
      "date": "2026-01-12T18:00Z",
      "name": "Kansas City Chiefs at Buffalo Bills",
      "status": {
        "type": {
          "state": "pre"   // "pre" | "in" | "post"
        }
      },
      "competitions": [
        {
          "venue": {
            "fullName": "Highmark Stadium",
            "address": {"city": "Orchard Park", "state": "NY"}
          },
          "competitors": [
            {
              "homeAway": "home",
              "score": "24",
              "team": {
                "id": "2",
                "displayName": "Buffalo Bills",
                "abbreviation": "BUF",
                "logos": [{"href": "https://a.espncdn.com/..."}],
                "color": "00338D"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

**Status mapping:**
| ESPN `state` | CalSync `status` |
|---|---|
| `"pre"` | `"scheduled"` |
| `"in"` | `"live"` |
| `"post"` | `"completed"` |

#### `GET /teams?limit=50`
Returns all teams for a league.

**Key response structure:**
```json
{
  "sports": [
    {
      "leagues": [
        {
          "teams": [
            {
              "team": {
                "id": "1",
                "displayName": "Atlanta Falcons",
                "abbreviation": "ATL",
                "logos": [{"href": "https://a.espncdn.com/..."}],
                "color": "A71930"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Image Hostnames
ESPN logo URLs come from several CDN subdomains. All image components use native `<img>` tags (not `next/image`) so no hostname allowlist is required.

---

## CalSync Internal API Reference

All endpoints are served by the FastAPI backend on port `8000`.

### `GET /api/leagues`
Returns all active leagues (seeded at startup).

**Query params:** `?sport={sport_type}` (optional filter)

**Response:** `League[]` — `id, name, slug, sport_type, country, logo_url, event_count`

---

### `GET /api/leagues/{slug}`
Returns a single league with its full team list.

**Response:** `League & { teams: Team[] }`

---

### `GET /api/events/upcoming`
Returns upcoming events across all leagues.

**Query params:** `?limit=20&sport={sport_type}`

---

### `GET /api/events`
Paginated event list with filters.

**Query params:** `?league=formula-1&team=lal&from=ISO&to=ISO&page=1&page_size=20`

---

### `POST /api/feeds`
Create (or retrieve) a calendar feed.

**Request body:**
```json
{
  "league_ids": [1, 2],
  "team_ids": [],
  "reminder_minutes": 30
}
```
- `reminder_minutes` is optional (`null` / 15 / 30 / 60). Stored on the feed and embedded as `VALARM` in every ICS event.

**Response:**
```json
{
  "feed_hash": "76b296d0...",
  "feed_url": "http://localhost:8000/cal/76b296d0....ics",
  "webcal_url": "webcal://localhost:8000/cal/76b296d0....ics",
  "event_count": 141
}
```
Side-effects: pre-warms the Redis ICS cache immediately on creation.

---

### `GET /cal/{feed_hash}.ics`
Serves the RFC 5545 `.ics` calendar feed.

- Returns bytes with `Content-Type: text/calendar`.
- Served from Redis cache (15 min TTL) when warm; falls back to PostgreSQL + ICS generation.
- Increments `access_count` and updates `last_accessed_at` on `CalendarFeed` (best-effort even on cache hits).
- Contains `VALARM` per event if `reminder_minutes` was set at feed creation.

---

### `GET /api/admin/feeds`
Returns all generated feeds with analytics data. No auth — intended for internal/operator use.

**Response:**
```json
{
  "items": [
    {
      "feed_hash": "f40b3ae2...",
      "league_ids": [2, 4],
      "team_ids": [],
      "event_count": 107,
      "access_count": 3,
      "last_accessed_at": "2026-04-08T01:23:45+00:00",
      "created_at": "2026-04-08T00:10:00+00:00",
      "reminder_minutes": 15
    }
  ],
  "total": 4
}
```

---

## Former API: Jolpica / Ergast (F1 — Deprecated)

The original F1 adapter used the Jolpica API (the successor to the retired Ergast API):

**Base:** `https://api.jolpi.ca/ergast/f1/`

**Endpoints tried:**
- `GET /2025/races.json` — Season race schedule
- `GET /2025/constructors.json` — Constructor (team) list

**Why migrated away:**
- Suffered DNS resolution failures at Docker container cold-start
- Rate limiting issues during rapid restarts
- Response structure had fragile nested keys (`data["MRData"]["RaceTable"]["Races"]`)
- Replaced with OpenF1 which is purpose-built, more reliable, and returns richer session data (including exact start/end times per session)

**Do not re-introduce Jolpica/Ergast** unless OpenF1 becomes unavailable.
