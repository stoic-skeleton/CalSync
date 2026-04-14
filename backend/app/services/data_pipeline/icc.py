"""
ICC tournament adapters — uses CricAPI (cricapi.com).

Series IDs (valid as of April 2026, update each cycle by querying
  GET https://api.cricapi.com/v1/series?apikey=KEY&search=ICC):

  ICC Men's T20 World Cup 2026:    5978f057-af70-4dcf-b9ee-04831b8df947  (55 matches, Feb-Mar 2026)
  ICC Women's T20 World Cup 2026:  f3e5c7dd-332c-4893-9067-aa2bfe6d2b85  (33 matches, Jun-Jul 2026)
"""
import logging
import os
from datetime import datetime, timezone

import httpx

from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam

logger = logging.getLogger(__name__)

CRICAPI_BASE = "https://api.cricapi.com/v1"
CRICAPI_KEY = os.environ.get("CRICAPI_KEY", "")

# ESPN CDN country logos — keyed by lowercased team name with gender/age suffixes stripped.
_ICC_COUNTRY_LOGOS: dict[str, str] = {
    "india":        "https://a.espncdn.com/i/teamlogos/countries/500/ind.png",
    "england":      "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
    "australia":    "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
    "new zealand":  "https://a.espncdn.com/i/teamlogos/countries/500/nzl.png",
    "pakistan":     "https://a.espncdn.com/i/teamlogos/countries/500/pak.png",
    "south africa": "https://a.espncdn.com/i/teamlogos/countries/500/rsa.png",
    "bangladesh":   "https://a.espncdn.com/i/teamlogos/countries/500/ban.png",
    "sri lanka":    "https://a.espncdn.com/i/teamlogos/countries/500/sri.png",
    "afghanistan":  "https://a.espncdn.com/i/teamlogos/countries/500/afg.png",
    "zimbabwe":     "https://a.espncdn.com/i/teamlogos/countries/500/zim.png",
    "ireland":      "https://a.espncdn.com/i/teamlogos/countries/500/irl.png",
    "scotland":     "https://a.espncdn.com/i/teamlogos/countries/500/sco.png",
    "netherlands":  "https://a.espncdn.com/i/teamlogos/countries/500/ned.png",
    "west indies":  "https://a.espncdn.com/i/teamlogos/cricket/500/4.png",
    "usa":          "https://a.espncdn.com/i/teamlogos/countries/500/usa.png",
    "canada":       "https://a.espncdn.com/i/teamlogos/countries/500/can.png",
    "uae":          "https://a.espncdn.com/i/teamlogos/countries/500/uae.png",
}


def _icc_logo_for(team_name: str) -> str | None:
    """Strip gender/age suffixes then return an ESPN country logo URL."""
    key = (
        team_name.lower()
        .replace(" women", "")
        .replace(" men", "")
        .replace(" u19", "")
        .replace(" xi", "")
        .strip()
    )
    return _ICC_COUNTRY_LOGOS.get(key)


# Series IDs — environment variable overrides allow updating without a code deploy
ICC_MENS_T20_2026_ID = os.environ.get(
    "ICC_MENS_T20_SERIES_ID", "5978f057-af70-4dcf-b9ee-04831b8df947"
)
ICC_WOMENS_T20_2026_ID = os.environ.get(
    "ICC_WOMENS_T20_SERIES_ID", "f3e5c7dd-332c-4893-9067-aa2bfe6d2b85"
)


class _CricAPISeriesAdapter(SportAdapter):
    """Base adapter — subclasses set league_slug and series_id."""

    series_id: str = ""
    league_slug: str = ""

    def __init__(self) -> None:
        self._cached_matches: list[dict] | None = None

    async def _fetch_match_list(self) -> list[dict]:
        if self._cached_matches is not None:
            return self._cached_matches
        if not CRICAPI_KEY or not self.series_id:
            logger.warning("CRICAPI_KEY not set or series_id missing for %s", self.league_slug)
            return []
        url = f"{CRICAPI_BASE}/series_info?apikey={CRICAPI_KEY}&id={self.series_id}"
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.get(url)
            res.raise_for_status()
        data = res.json()
        if data.get("status") != "success":
            logger.warning("CricAPI returned failure for %s: %s", self.league_slug, data.get("reason"))
            self._cached_matches = []
            return []
        self._cached_matches = data.get("data", {}).get("matchList", [])
        return self._cached_matches

    async def fetch_teams(self) -> list[RawTeam]:
        matches = await self._fetch_match_list()
        seen: dict[str, RawTeam] = {}
        for m in matches:
            parts = m.get("name", "").split(",")[0].split(" vs ")
            for team_name in parts:
                team_name = team_name.strip()
                key = team_name.lower()
                if key and key not in seen:
                    seen[key] = RawTeam(
                        external_id=f"icc-{key.replace(' ', '-')}",
                        name=team_name,
                        logo_url=_icc_logo_for(team_name),
                    )
        return list(seen.values())

    async def fetch_events(self) -> list[RawEvent]:
        matches = await self._fetch_match_list()
        events: list[RawEvent] = []

        for m in matches:
            match_id = m.get("id")
            if not match_id:
                continue

            dt_str = m.get("dateTimeGMT") or m.get("date")
            if not dt_str:
                continue
            try:
                start = datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            name_part = m.get("name", "").split(",")[0]
            teams = name_part.split(" vs ")
            home_name = teams[0].strip() if len(teams) > 0 else ""
            away_name = teams[1].strip() if len(teams) > 1 else ""
            home_ext_id = f"icc-{home_name.lower().replace(' ', '-')}" if home_name else None
            away_ext_id = f"icc-{away_name.lower().replace(' ', '-')}" if away_name else None

            status_str = (m.get("status") or "").lower()
            if "won" in status_str or "result" in status_str or "match tied" in status_str:
                status = "completed"
            elif "rain" in status_str or "abandon" in status_str or "cancel" in status_str:
                status = "cancelled"
            else:
                status = "scheduled"

            events.append(RawEvent(
                external_id=f"icc-{match_id}",
                title=m.get("name", ""),
                home_team_external_id=home_ext_id,
                away_team_external_id=away_ext_id,
                start_time=start,
                end_time=None,
                venue=m.get("venue") or None,
                city=None,
                status=status,
                broadcast_info=None,
            ))

        return events


class ICCMensT20Adapter(_CricAPISeriesAdapter):
    league_slug = "icc-mens-t20-wc"
    series_id = ICC_MENS_T20_2026_ID


class ICCWomensT20Adapter(_CricAPISeriesAdapter):
    league_slug = "icc-womens-t20-wc"
    series_id = ICC_WOMENS_T20_2026_ID
