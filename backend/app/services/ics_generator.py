"""
RFC 5545-compliant .ics feed generator.
Converts a list of SQLAlchemy Event objects into a VCALENDAR bytes payload.
"""
from datetime import timezone, timedelta
from icalendar import Calendar, Event as ICalEvent, Alarm, vText, vDatetime
from app.models import Event


def build_ics(events: list[Event], feed_hash: str, reminder_minutes: int | None = None) -> bytes:
    cal = Calendar()
    cal.add("PRODID", "-//CalSync//Sports Calendar//EN")
    cal.add("VERSION", "2.0")
    cal.add("CALSCALE", "GREGORIAN")
    cal.add("METHOD", "PUBLISH")
    cal.add("X-WR-CALNAME", "CalSync — Sports Schedule")
    cal.add("X-WR-CALDESC", "Auto-updating sports calendar from CalSync (calsync.dev)")
    cal.add("X-WR-TIMEZONE", "UTC")
    cal.add("REFRESH-INTERVAL;VALUE=DURATION", "PT30M")
    cal.add("X-PUBLISHED-TTL", "PT30M")

    for event in events:
        ical_event = ICalEvent()

        # UID — stable across refreshes
        uid = f"{event.external_id or event.id}@calsync"
        ical_event.add("UID", uid)

        # Timestamps
        ical_event.add("DTSTART", event.start_time.astimezone(timezone.utc))
        if event.end_time:
            ical_event.add("DTEND", event.end_time.astimezone(timezone.utc))
        ical_event.add("DTSTAMP", event.updated_at.astimezone(timezone.utc))

        # Summary
        ical_event.add("SUMMARY", _build_summary(event))

        # Description
        desc = _build_description(event)
        if desc:
            ical_event.add("DESCRIPTION", desc)

        # Location
        if event.venue or event.city:
            parts = [p for p in [event.venue, event.city] if p]
            ical_event.add("LOCATION", ", ".join(parts))

        # Categories
        ical_event.add("CATEGORIES", [event.league.sport_type, event.league.name])

        # Status
        status_map = {
            "scheduled": "CONFIRMED",
            "live": "CONFIRMED",
            "completed": "CONFIRMED",
            "postponed": "TENTATIVE",
            "cancelled": "CANCELLED",
        }
        ical_event.add("STATUS", status_map.get(event.status, "CONFIRMED"))

        # URL
        if event.url:
            ical_event.add("URL", event.url)

        # Optional reminder (VALARM) added per-event when requested
        if reminder_minutes is not None:
            alarm = Alarm()
            alarm.add("ACTION", "DISPLAY")
            alarm.add("DESCRIPTION", f"Reminder: {event.title}")
            # timedelta required by icalendar library for duration-based triggers
            alarm.add("TRIGGER", timedelta(minutes=-int(reminder_minutes)))
            ical_event.add_component(alarm)

        cal.add_component(ical_event)

    return cal.to_ical()


def _build_summary(event: Event) -> str:
    if event.home_team and event.away_team:
        home = event.home_team.short_name or event.home_team.name
        away = event.away_team.short_name or event.away_team.name
        return f"{home} vs {away} [{event.league.name}]"
    return event.title


def _build_description(event: Event) -> str:
    parts: list[str] = []

    if event.home_team and event.away_team:
        parts.append(f"{event.home_team.name} vs {event.away_team.name}")

    parts.append(f"League: {event.league.name}")

    if event.event_type:
        parts.append(f"Type: {event.event_type.replace('_', ' ').title()}")

    if event.venue:
        loc = event.venue
        if event.city:
            loc += f", {event.city}"
        parts.append(f"Venue: {loc}")

    if event.broadcast_info:
        parts.append(f"Watch on: {event.broadcast_info}")

    if event.score:
        parts.append(f"Score: {event.score}")

    if event.description:
        parts.append(event.description)

    parts.append("\\nSync more sports at calsync.dev")

    return "\\n".join(parts)
