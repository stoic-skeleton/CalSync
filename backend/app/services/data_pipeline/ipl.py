"""
IPL adapter — uses TheSportsDB free API.
Notes:
 - lookup_all_teams and eventsnextleague endpoints IGNORE the id param on the free key "3"
   and return random data. The eventsseason endpoint works correctly.
 - Teams are extracted from the events payload (each event carries team id, name, badge).
"""
from datetime import datetime, timezone
import httpx
from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam

BASE = "https://www.thesportsdb.com/api/v1/json/3"
# Confirmed via search_all_leagues: idLeague 4460 = Indian Premier League (Cricket)
IPL_LEAGUE_ID = "4460"
# Fetch both current and next season to maximise coverage;
# TheSportsDB adds fixtures incrementally so fetching two seasons catches more data.
IPL_SEASONS = ["2026", "2025"]


class IPLAdapter(SportAdapter):
    league_slug = "ipl"

    async def _fetch_season_events(self) -> list[dict]:
        """Fetch from multiple seasons and deduplicate by idEvent."""
        seen_ids: set[str] = set()
        all_events: list[dict] = []
        async with httpx.AsyncClient(timeout=15) as client:
            for season in IPL_SEASONS:
                url = f"{BASE}/eventsseason.php?id={IPL_LEAGUE_ID}&s={season}"
                try:
                    res = await client.get(url)
                    res.raise_for_status()
                    for ev in (res.json().get("events") or []):
                        eid = ev.get("idEvent")
                        if eid and eid not in seen_ids:
                            seen_ids.add(eid)
                            all_events.append(ev)
                except Exception:
                    continue
        return all_events

    async def fetch_teams(self) -> list[RawTeam]:
        """Extract unique teams from the events data — avoids the broken lookup_all_teams endpoint."""
        events_data = await self._fetch_season_events()
        seen: dict[str, RawTeam] = {}
        for ev in events_data:
            for id_key, name_key, badge_key in [
                ("idHomeTeam", "strHomeTeam", "strHomeTeamBadge"),
                ("idAwayTeam", "strAwayTeam", "strAwayTeamBadge"),
            ]:
                tid = ev.get(id_key)
                name = ev.get(name_key)
                if tid and name and tid not in seen:
                    seen[tid] = RawTeam(
                        external_id=tid,
                        name=name,
                        short_name=None,
                        logo_url=ev.get(badge_key) or None,
                    )
        return list(seen.values())

    async def fetch_events(self) -> list[RawEvent]:
        events_data = await self._fetch_season_events()
        events: list[RawEvent] = []

        for ev in events_data:
            date_str = ev.get("dateEvent", "")
            time_str = ev.get("strTime", "00:00:00") or "00:00:00"
            try:
                start = datetime.fromisoformat(f"{date_str}T{time_str}").replace(tzinfo=timezone.utc)
            except ValueError:
                continue

            # Skip events that are already in the past
            # (keep them — ingest.py handles status; let the DB decide what's upcoming)

            score = None
            hs = ev.get("intHomeScore")
            as_ = ev.get("intAwayScore")
            if hs is not None and as_ is not None:
                score = f"{hs}-{as_}"

            postponed = (ev.get("strPostponed") or "").lower() == "yes"
            has_score = hs is not None and as_ is not None
            status = "postponed" if postponed else ("completed" if has_score else "scheduled")

            events.append(
                RawEvent(
                    external_id=ev["idEvent"],
                    title=ev.get("strEvent", ""),
                    event_type="match",
                    start_time=start,
                    venue=ev.get("strVenue"),
                    city=ev.get("strCity"),
                    home_team_external_id=ev.get("idHomeTeam"),
                    away_team_external_id=ev.get("idAwayTeam"),
                    status=status,
                    score=score,
                    broadcast_info=ev.get("strTVStation"),
                )
            )
        return events

