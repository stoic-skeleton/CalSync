"""
F1 data adapter — uses the OpenF1 API (free, no auth required).
Docs: https://openf1.org
Endpoints used:
  GET https://api.openf1.org/v1/meetings?year=YYYY   — GP calendar
  GET https://api.openf1.org/v1/sessions?year=YYYY   — individual sessions
"""
import asyncio
from datetime import datetime, timezone
import httpx
from app.services.data_pipeline.base import SportAdapter, RawEvent, RawTeam

BASE = "https://api.openf1.org/v1"
YEAR = 2026

# Only these session types are surfaced as calendar events
SESSION_TYPES = {"Practice", "Qualifying", "Sprint", "Sprint Qualifying", "Race"}

# ESPN's racing/f1 teams endpoint returns `"logos": []` for all constructors.
# TheSportsDB provides current-season badges (verified April 2026).
_F1_TEAM_LOGOS: dict[str, str] = {
    "alpine":        "https://r2.thesportsdb.com/images/media/team/badge/ozhoj31740774899.png",
    "aston martin":  "https://r2.thesportsdb.com/images/media/team/badge/ez5rl11740774066.png",
    "audi":          "https://www.thesportsdb.com/images/media/team/badge/3uce6h1773158180.png",
    "cadillac":      "https://r2.thesportsdb.com/images/media/team/badge/2wqnjo1769429652.png",
    "ferrari":       "https://r2.thesportsdb.com/images/media/team/badge/rxwsqv1420417429.png",
    "haas":          "https://r2.thesportsdb.com/images/media/team/badge/9p3s51740773680.png",
    "mclaren":       "https://r2.thesportsdb.com/images/media/team/badge/kzqi7v1743602056.png",
    "mercedes":      "https://r2.thesportsdb.com/images/media/team/badge/6caw0r1744037679.png",
    "racing bulls":  "https://r2.thesportsdb.com/images/media/team/badge/ot7pjx1740775883.png",
    "red bull":      "https://r2.thesportsdb.com/images/media/team/badge/nhlev81679826274.png",
    "williams":      "https://r2.thesportsdb.com/images/media/team/badge/fp1cil1740776050.png",
}


def _f1_logo_for(display_name: str) -> str | None:
    name = display_name.lower()
    for key, url in _F1_TEAM_LOGOS.items():
        if key in name:
            return url
    return None


async def _get_with_retry(url: str, timeout: float = 20.0, retries: int = 4) -> httpx.Response:
    """GET with exponential backoff — handles transient DNS failures at container startup."""
    last_exc: Exception | None = None
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url)
                res.raise_for_status()
                return res
        except Exception as exc:
            last_exc = exc
            await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s, 8s
    raise last_exc  # type: ignore[misc]


class F1Adapter(SportAdapter):
    league_slug = "formula-1"

    async def fetch_teams(self) -> list[RawTeam]:
        """F1 constructors — OpenF1 doesn't expose a teams endpoint so use ESPN."""
        try:
            url = "https://site.api.espn.com/apis/site/v2/sports/racing/f1/teams?limit=30"
            res = await _get_with_retry(url)
            teams_data = res.json().get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", [])
            return [
                RawTeam(
                    external_id=t["team"]["id"],
                    name=t["team"].get("displayName", t["team"].get("name", "")),
                    short_name=t["team"].get("abbreviation"),
                    logo_url=(
                        (t["team"].get("logos") or [{}])[0].get("href")
                        or _f1_logo_for(t["team"].get("displayName", t["team"].get("name", "")))
                    ),
                    primary_color=f"#{t['team']['color']}" if t["team"].get("color") else None,
                )
                for t in teams_data
            ]
        except Exception:
            return []

    async def fetch_events(self) -> list[RawEvent]:
        # Fetch meetings (GP weekends) and sessions in parallel
        meetings_res, sessions_res = await asyncio.gather(
            _get_with_retry(f"{BASE}/meetings?year={YEAR}"),
            _get_with_retry(f"{BASE}/sessions?year={YEAR}"),
        )

        meetings: dict[int, dict] = {
            m["meeting_key"]: m for m in meetings_res.json()
            if m.get("meeting_name") and "testing" not in m["meeting_name"].lower()
        }

        now = datetime.now(timezone.utc)
        events: list[RawEvent] = []

        for session in sessions_res.json():
            if session.get("session_type") not in SESSION_TYPES:
                continue
            meeting_key = session.get("meeting_key")
            meeting = meetings.get(meeting_key)
            if not meeting:
                continue

            try:
                start = datetime.fromisoformat(session["date_start"])
            except (KeyError, ValueError, TypeError):
                continue

            end = None
            if session.get("date_end"):
                try:
                    end = datetime.fromisoformat(session["date_end"])
                except (ValueError, TypeError):
                    pass

            gp_name = meeting.get("meeting_name", "Grand Prix")
            session_name = session.get("session_name", session["session_type"])
            circuit = meeting.get("circuit_short_name", "")
            country = meeting.get("country_name", "")
            city = f"{meeting.get('location', '')}, {country}".strip(", ")
            status = "completed" if start < now else "scheduled"

            events.append(
                RawEvent(
                    external_id=f"openf1-{session['session_key']}",
                    title=f"{gp_name} — {session_name}",
                    event_type=session["session_type"].lower().replace(" ", "_"),
                    start_time=start,
                    end_time=end,
                    venue=circuit,
                    city=city,
                    status=status,
                    description=f"{YEAR} Formula 1 World Championship",
                )
            )

        return events[:100]

