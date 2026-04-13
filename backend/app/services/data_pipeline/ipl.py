"""
IPL adapter — uses CricAPI (cricapi.com).
Docs: https://cricapi.com/cricapi/apis/
Endpoints used:
  GET https://api.cricapi.com/v1/series_info?apikey=KEY&id=SERIES_ID
    — returns full match list for the IPL series (70 matches for 2026)

TheSportsDB was the previous source but only had ~15 fixtures available
(they add incrementally). CricAPI has the full fixture list from day one.

Series IDs (update each year by querying /v1/series and searching "Indian Premier League"):
  2026: 87c62aac-bc3c-4738-ab93-19da0690488f
"""
import logging
import os
from datetime import datetime, timezone
import httpx
from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam

logger = logging.getLogger(__name__)

CRICAPI_BASE = "https://api.cricapi.com/v1"
# Read from env so the key is not hardcoded in source — set CRICAPI_KEY in Railway variables
CRICAPI_KEY = os.environ.get("CRICAPI_KEY", "")
IPL_SERIES_ID = "87c62aac-bc3c-4738-ab93-19da0690488f"  # Indian Premier League 2026

# Static team logos sourced from TheSportsDB (verified April 2026)
# Key must match a substring of the team name returned by CricAPI
_TEAM_LOGOS: dict[str, str] = {
    "Mumbai Indians":            "https://r2.thesportsdb.com/images/media/team/badge/l40j8p1487678631.png",
    "Chennai Super Kings":       "https://r2.thesportsdb.com/images/media/team/badge/okceh51487601098.png",
    "Royal Challengers":         "https://r2.thesportsdb.com/images/media/team/badge/kynj5v1588331757.png",
    "Kolkata Knight Riders":     "https://r2.thesportsdb.com/images/media/team/badge/ows99r1487678296.png",
    "Delhi Capitals":            "https://r2.thesportsdb.com/images/media/team/badge/dg4g0z1587334054.png",
    "Punjab Kings":              "https://r2.thesportsdb.com/images/media/team/badge/r1tcie1630697821.png",
    "Rajasthan Royals":          "https://r2.thesportsdb.com/images/media/team/badge/lehnfw1487601864.png",
    "Sunrisers Hyderabad":       "https://r2.thesportsdb.com/images/media/team/badge/sc7m161487419327.png",
    "Lucknow Super Giants":      "https://r2.thesportsdb.com/images/media/team/badge/4tzmfa1647445839.png",
    "Gujarat Titans":            "https://r2.thesportsdb.com/images/media/team/badge/6qw4r71654174508.png",
}


def _logo_for(team_name: str) -> str | None:
    for key, url in _TEAM_LOGOS.items():
        if key.lower() in team_name.lower():
            return url
    return None


class IPLAdapter(SportAdapter):
    league_slug = "ipl"

    def __init__(self) -> None:
        self._cached_matches: list[dict] | None = None

    async def _fetch_match_list(self) -> list[dict]:
        if self._cached_matches is not None:
            return self._cached_matches
        if not CRICAPI_KEY:
            logger.warning("CRICAPI_KEY not set — skipping IPL ingest")
            return []
        url = f"{CRICAPI_BASE}/series_info?apikey={CRICAPI_KEY}&id={IPL_SERIES_ID}"
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url)
            res.raise_for_status()
        data = res.json()
        if data.get("status") != "success":
            logger.warning("CricAPI returned failure for IPL: %s", data.get("reason"))
            self._cached_matches = []
            return []
        self._cached_matches = data.get("data", {}).get("matchList", [])
        return self._cached_matches

    async def fetch_teams(self) -> list[RawTeam]:
        matches = await self._fetch_match_list()
        seen: dict[str, RawTeam] = {}
        for m in matches:
            # name format: "Team A vs Team B, Nth Match, Indian Premier League 2026"
            parts = m.get("name", "").split(",")[0].split(" vs ")
            for team_name in parts:
                team_name = team_name.strip()
                # Use lowercase name as key to deduplicate
                key = team_name.lower()
                if key and key not in seen:
                    seen[key] = RawTeam(
                        external_id=f"ipl-{key.replace(' ', '-')}",
                        name=team_name,
                        logo_url=_logo_for(team_name),
                    )
        return list(seen.values())

    async def fetch_events(self) -> list[RawEvent]:
        matches = await self._fetch_match_list()
        events: list[RawEvent] = []

        for m in matches:
            match_id = m.get("id")
            if not match_id:
                continue

            # dateTimeGMT is "2026-04-11T14:00:00" — treat as UTC
            dt_str = m.get("dateTimeGMT") or m.get("date")
            if not dt_str:
                continue
            try:
                # dateTimeGMT has no timezone suffix — it is UTC
                start = datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            # Parse team names from match name
            name_part = m.get("name", "").split(",")[0]  # "Team A vs Team B"
            teams = name_part.split(" vs ")
            home_name = teams[0].strip() if len(teams) > 0 else ""
            away_name = teams[1].strip() if len(teams) > 1 else ""
            home_ext_id = f"ipl-{home_name.lower().replace(' ', '-')}" if home_name else None
            away_ext_id = f"ipl-{away_name.lower().replace(' ', '-')}" if away_name else None

            status_str = (m.get("status") or "").lower()
            if "won" in status_str or "result" in status_str or "match tied" in status_str:
                status = "completed"
            elif "rain" in status_str or "abandon" in status_str or "cancel" in status_str:
                status = "cancelled"
            else:
                status = "scheduled"

            events.append(
                RawEvent(
                    external_id=f"cricapi-{match_id}",
                    title=f"{home_name} vs {away_name}" if home_name else m.get("name", ""),
                    event_type="match",
                    start_time=start,
                    venue=m.get("venue"),
                    home_team_external_id=home_ext_id,
                    away_team_external_id=away_ext_id,
                    status=status,
                    description="Indian Premier League 2026",
                )
            )

        return events

