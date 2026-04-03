# CalSync — External APIs Reference

## Summary Table

| League    | API Name         | Base URL                                                | Auth     | Cost |
|-----------|------------------|---------------------------------------------------------|----------|------|
| Formula 1 | OpenF1           | `https://api.openf1.org/v1`                             | None     | Free |
| F1 Teams  | ESPN (fallback)  | `https://site.api.espn.com/apis/site/v2/sports/racing/f1` | None  | Free |
| IPL       | TheSportsDB      | `https://www.thesportsdb.com/api/v1/json/3`             | None (key `3` = free tier) | Free |
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

## IPL — TheSportsDB

**Docs:** https://www.thesportsdb.com/api.php  
**Base:** `https://www.thesportsdb.com/api/v1/json/3`  
**Auth:** API key `3` embedded in URL path (free tier).

### League Identifier
- **`IPL_LEAGUE_ID = "4460"`** — Indian Premier League (Cricket)
- **Warning:** ID `4792` is a football league. ID `4452` was also tried in earlier sessions. `4460` is the confirmed correct IPL ID verified via `search_all_leagues`.

### Endpoints Used

#### `GET /eventsseason.php?id={IPL_LEAGUE_ID}&s={season}`
Returns all matches for a given season year.

**Key response fields:**
```json
{
  "idEvent": "1234567",
  "strEvent": "Mumbai Indians vs Chennai Super Kings",
  "dateEvent": "2026-04-05",
  "strTime": "14:00:00",
  "idHomeTeam": "133600",
  "strHomeTeam": "Mumbai Indians",
  "strHomeTeamBadge": "https://www.thesportsdb.com/images/media/team/badge/...",
  "idAwayTeam": "133601",
  "strAwayTeam": "Chennai Super Kings",
  "strAwayTeamBadge": "https://...",
  "intHomeScore": null,
  "intAwayScore": null,
  "strVenue": "Wankhede Stadium",
  "strCity": "Mumbai",
  "strTVStation": "Star Sports",
  "strPostponed": "no"
}
```

**Seasons fetched:** `["2026", "2025"]` — both seasons fetched and deduplicated by `idEvent` to maximise coverage (TheSportsDB adds fixtures incrementally).

### Known Quirks and Limitations

1. **`lookup_all_teams` is broken on free tier** — Returns random/incorrect data when called with the free API key `3`. Do not use. Teams are extracted from the events payload instead (each event carries `idHomeTeam`, `strHomeTeam`, `strHomeTeamBadge`, etc.).

2. **`eventsnextleague` ignores the `id` param** — Also unreliable on free tier. Use `eventsseason` instead.

3. **Incremental fixture addition** — TheSportsDB adds IPL fixtures incrementally as the tournament progresses. Early in the season, only the first few weeks may be available.

4. **Time zone**: All times are UTC. `strTime` may be `null` for some entries — default to `"00:00:00"`.

5. **Image hostname** — Team badge URLs come from `www.thesportsdb.com` and `r2.thesportsdb.com`. Both must be in `next.config.ts` `remotePatterns` for `next/image` to work.

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
ESPN logo URLs come from several CDN subdomains. All must be in `next.config.ts`:
- `a.espncdn.com`
- `a1.espncdn.com`
- `a2.espncdn.com`
- `a4.espncdn.com`
- `**.espncdn.com` (wildcard catches future subdomains)

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
