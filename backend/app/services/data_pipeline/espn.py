"""
ESPN undocumented public API adapter — used for NFL, NBA, MLS.
These endpoints are widely used and publicly accessible without auth.

NFL:  https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
NBA:  https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard
MLS:  https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard
"""
from datetime import datetime, timezone, timedelta
import httpx
from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam


class ESPNAdapter(SportAdapter):
    """
    Generic ESPN scoreboard adapter.

    Subclass and set:
        league_slug  — calSync DB slug
        espn_sport   — e.g. "football"
        espn_league  — e.g. "nfl"
        days_ahead   — how many days of schedule to request
    """
    espn_sport: str
    espn_league: str
    days_ahead: int = 30

    @property
    def _base(self) -> str:
        return (
            f"https://site.api.espn.com/apis/site/v2/sports/"
            f"{self.espn_sport}/{self.espn_league}"
        )

    async def _fetch_scoreboard(self, date_range: str, page: int = 1) -> dict:
        url = f"{self._base}/scoreboard?dates={date_range}&limit=100&page={page}"
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url)
            res.raise_for_status()
        return res.json()

    async def fetch_teams(self) -> list[RawTeam]:
        url = f"{self._base}/teams?limit=50"
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url)
            res.raise_for_status()
        teams_data = res.json().get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", [])
        teams = []
        for t in teams_data:
            team = t.get("team", {})
            logo = (team.get("logos") or [{}])[0].get("href")
            color = team.get("color")
            teams.append(
                RawTeam(
                    external_id=team["id"],
                    name=team.get("displayName", team.get("name", "")),
                    short_name=team.get("abbreviation"),
                    logo_url=logo,
                    primary_color=f"#{color}" if color else None,
                )
            )
        return teams

    async def _fetch_scoreboard(self, yyyymm: str, page: int = 1) -> dict:
        # ESPN scoreboard requires per-month queries (YYYYMM), not date ranges
        url = f"{self._base}/scoreboard?dates={yyyymm}&limit=100&page={page}"
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url)
            res.raise_for_status()
        return res.json()

    def _months_in_range(self) -> list[str]:
        """Return YYYYMM strings from 30 days ago through days_ahead from today."""
        today = datetime.now(timezone.utc)
        start = today - timedelta(days=30)
        end = today + timedelta(days=self.days_ahead)
        months: list[str] = []
        cur = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        while cur <= end:
            months.append(cur.strftime("%Y%m"))
            if cur.month == 12:
                cur = cur.replace(year=cur.year + 1, month=1)
            else:
                cur = cur.replace(month=cur.month + 1)
        return months

    async def fetch_events(self) -> list[RawEvent]:
        # Query each month separately — ESPN only returns data for YYYYMM format
        raw_games: list[dict] = []
        for yyyymm in self._months_in_range():
            try:
                data = await self._fetch_scoreboard(yyyymm)
                raw_games.extend(data.get("events", []))
            except Exception:
                continue

        # Deduplicate by ESPN game id (adjacent months can overlap)
        seen_ids: set[str] = set()
        events: list[RawEvent] = []
        for game in raw_games:
            gid = game.get("id", "")
            if gid in seen_ids:
                continue
            seen_ids.add(gid)
            competition = (game.get("competitions") or [{}])[0]
            competitors = competition.get("competitors", [])

            home = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away = next((c for c in competitors if c.get("homeAway") == "away"), None)
            venue_data = competition.get("venue", {})
            addr = venue_data.get("address", {})

            try:
                start = datetime.fromisoformat(
                    game["date"].replace("Z", "+00:00")
                )
            except (KeyError, ValueError):
                continue

            status_val = game.get("status", {}).get("type", {}).get("state", "pre")
            status = {"pre": "scheduled", "in": "live", "post": "completed"}.get(status_val, "scheduled")

            home_id = home["team"]["id"] if home else None
            away_id = away["team"]["id"] if away else None
            home_name = home["team"].get("displayName", "Home") if home else "Home"
            away_name = away["team"].get("displayName", "Away") if away else "Away"

            score = None
            if status == "completed" and home and away:
                hs = home.get("score", "")
                as_ = away.get("score", "")
                if hs and as_:
                    score = f"{hs}-{as_}"

            events.append(
                RawEvent(
                    external_id=game["id"],
                    title=f"{home_name} vs {away_name}",
                    event_type="match",
                    start_time=start,
                    venue=venue_data.get("fullName"),
                    city=f"{addr.get('city', '')}, {addr.get('state', '')}".strip(", ") or None,
                    home_team_external_id=home_id,
                    away_team_external_id=away_id,
                    status=status,
                    score=score,
                    url=game.get("links", [{}])[0].get("href"),
                )
            )
        return events


# ── Concrete league adapters ───────────────────────────────────────────────

class NFLAdapter(ESPNAdapter):
    league_slug = "nfl"
    espn_sport = "football"
    espn_league = "nfl"
    # Cover current season remainder + full next season (preseason starts ~Aug)
    days_ahead = 300


class NBAAdapter(ESPNAdapter):
    league_slug = "nba"
    espn_sport = "basketball"
    espn_league = "nba"
    # Playoffs run through ~June; Finals end by mid-June
    days_ahead = 90


class MLSAdapter(ESPNAdapter):
    league_slug = "mls"
    espn_sport = "soccer"
    espn_league = "usa.1"
    # Regular season + playoffs run through ~Nov 2026
    days_ahead = 240


class FIFAWorldCupAdapter(ESPNAdapter):
    league_slug = "fifa-world-cup"
    espn_sport = "soccer"
    espn_league = "fifa.world"
    # Group stage through Final: Jun 11 – Jul 19 2026 (97 days); 120 gives buffer
    days_ahead = 120
