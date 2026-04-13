"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import SportFilter from "@/components/sport-filter";
import EventCard from "@/components/event-card";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import WeekStrip from "@/components/calendar/WeekStrip";
import EventList from "@/components/calendar/EventList";
import { monthRange } from "@/lib/calendar";
import { fetchUpcomingEvents, fetchEvents } from "@/lib/api";
import type { Event } from "@/lib/types";

function startOfCurrentMonth() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

export default function SchedulePage() {
  const [sport, setSport] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "calendar">("list");

  // After hydration, switch to calendar on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) setView("calendar");
  }, []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayMonth, setDisplayMonth] = useState<string>(startOfCurrentMonth);

  // Load list-view events
  const loadList = useCallback(async (sportFilter: string) => {
    setLoading(true);
    try {
      const res = await fetchUpcomingEvents(100, sportFilter || undefined);
      setEvents(
        res.length > 0
          ? res
          : sportFilter
          ? PLACEHOLDER_EVENTS.filter(e => e.league.sport_type === sportFilter)
          : PLACEHOLDER_EVENTS
      );
    } catch {
      setEvents(
        sportFilter
          ? PLACEHOLDER_EVENTS.filter(e => e.league.sport_type === sportFilter)
          : PLACEHOLDER_EVENTS
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load calendar-view events for a given month (paginate up to backend's max of 100/page)
  const loadCalendar = useCallback(async (monthIso: string) => {
    setLoading(true);
    try {
      const { from, to } = monthRange(monthIso);
      const first = await fetchEvents({ from, to, page_size: 100, page: 1 });
      let items = first.items ?? [];
      // Fetch remaining pages if there are more
      if (first.has_next) {
        const totalPages = Math.ceil(first.total / 100);
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            fetchEvents({ from, to, page_size: 100, page: i + 2 })
          )
        );
        items = [...items, ...rest.flatMap(r => r.items ?? [])];
      }
      setEvents(items);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Single combined effect — no double-fetch
  useEffect(() => {
    if (view === "list") {
      loadList(sport);
    } else {
      loadCalendar(displayMonth);
    }
  }, [view, sport, displayMonth, loadList, loadCalendar]);

  // When switching to calendar, default selectedDate to today if not set
  useEffect(() => {
    if (view === "calendar" && !selectedDate) {
      setSelectedDate(new Date().toISOString());
    }
  }, [view, selectedDate]);

  // Sport-filtered events for calendar components
  // Filter by sport; when in calendar view, show upcoming events only
  const now = Date.now();
  let filteredEvents = sport
    ? events.filter(e => e.league.sport_type === sport)
    : events;
  if (view === "calendar") {
    filteredEvents = filteredEvents.filter(e => new Date(e.start_time).getTime() >= now);
  }

  // Events for the selected date in calendar view
  const selectedDateStr = selectedDate ? new Date(selectedDate).toDateString() : "";
  const eventsForSelectedDate = filteredEvents.filter(
    e => new Date(e.start_time).toDateString() === selectedDateStr
  );
  const upcomingForDate = eventsForSelectedDate.filter(
    e => e.status === "scheduled" || e.status === "live" || e.status === "postponed"
  );
  const resultsForDate = eventsForSelectedDate.filter(
    e => e.status === "completed" || e.status === "cancelled"
  );

  // Group list-view events by formatted date
  const grouped: Record<string, Event[]> = {};
  if (view === "list") {
    for (const ev of events) {
      const date = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date(ev.start_time));
      (grouped[date] ??= []).push(ev);
    }
  }

  function handleRefresh() {
    if (view === "list") loadList(sport);
    else loadCalendar(displayMonth);
  }

  return (
    <div className="flex-1 px-4 py-10" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
              Upcoming Schedule
            </h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              All upcoming events across every league, in your local timezone.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div
              className="flex rounded-lg border p-0.5 gap-0.5"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <button
                onClick={() => setView("list")}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  background: view === "list" ? "var(--accent-muted)" : "transparent",
                  color: view === "list" ? "var(--accent)" : "var(--muted)",
                  fontWeight: view === "list" ? 600 : 400,
                }}
              >
                List
              </button>
              <button
                onClick={() => setView("calendar")}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{
                  background: view === "calendar" ? "var(--accent-muted)" : "transparent",
                  color: view === "calendar" ? "var(--accent)" : "var(--muted)",
                  fontWeight: view === "calendar" ? 600 : 400,
                }}
              >
                Calendar
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[var(--surface-hover)] disabled:opacity-50"
              style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Sport filter */}
        <div className="mb-8">
          <SportFilter value={sport} onChange={setSport} />
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: "var(--surface)" }}
              />
            ))}
          </div>
        ) : view === "calendar" ? (
          /* ── Calendar view ── */
          <div className="flex flex-col gap-6">
            {/* Week strip — mobile only */}
            <div className="md:hidden">
              <WeekStrip
                reference={selectedDate ?? displayMonth}
                events={filteredEvents}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </div>

            {/* Month grid — always visible */}
            <MonthCalendar
              displayMonth={displayMonth}
              events={filteredEvents}
              selected={selectedDate}
              onSelect={(d) => {
                setSelectedDate(d);
                // Sync displayMonth when user clicks a trailing/leading cell
                const clicked = new Date(d);
                const displayed = new Date(displayMonth);
                if (
                  clicked.getFullYear() !== displayed.getFullYear() ||
                  clicked.getMonth() !== displayed.getMonth()
                ) {
                  setDisplayMonth(new Date(clicked.getFullYear(), clicked.getMonth(), 1).toISOString());
                }
              }}
              onMonthChange={(newMonthIso) => {
                setDisplayMonth(newMonthIso);
              }}
            />

            {/* Events for selected date */}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a date"}
              </p>
              {eventsForSelectedDate.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>No events for this date.</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {upcomingForDate.length > 0 && (
                    <EventList events={upcomingForDate} />
                  )}
                  {resultsForDate.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Results</p>
                        <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                      </div>
                      <EventList events={resultsForDate} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          /* ── List view empty state ── */
          <div
            className="rounded-2xl p-12 text-center border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <Calendar size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
            <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              No events found
            </p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Try a different sport filter or check back later.
            </p>
          </div>
        ) : (
          /* ── List view ── */
          <div className="flex flex-col gap-8">
            {Object.entries(grouped).map(([date, evs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {date}
                  </p>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}
                  >
                    {evs.length} event{evs.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {evs.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder events shown when backend is offline
const PLACEHOLDER_EVENTS: Event[] = [
  {
    id: 1,
    league: { id: 1, name: "Formula 1", slug: "formula-1", sport_type: "motorsport", logo_url: null },
    home_team: null, away_team: null,
    title: "Japanese Grand Prix — Race",
    description: null,
    venue: "Suzuka International Racing Course",
    city: "Suzuka, Japan",
    start_time: new Date(Date.now() + 2 * 86400_000).toISOString(),
    end_time: null,
    status: "scheduled",
    broadcast_info: "Sky Sports F1",
    score: null,
  },
  {
    id: 2,
    league: { id: 2, name: "IPL", slug: "ipl", sport_type: "cricket", logo_url: null },
    home_team: { id: 10, name: "Mumbai Indians", short_name: "MI", logo_url: null },
    away_team: { id: 11, name: "Chennai Super Kings", short_name: "CSK", logo_url: null },
    title: "MI vs CSK",
    description: null,
    venue: "Wankhede Stadium",
    city: "Mumbai, India",
    start_time: new Date(Date.now() + 3 * 86400_000).toISOString(),
    end_time: null,
    status: "scheduled",
    broadcast_info: "Star Sports / JioCinema",
    score: null,
  },
  {
    id: 3,
    league: { id: 4, name: "NBA", slug: "nba", sport_type: "basketball", logo_url: null },
    home_team: { id: 20, name: "Golden State Warriors", short_name: "GSW", logo_url: null },
    away_team: { id: 21, name: "Los Angeles Lakers", short_name: "LAL", logo_url: null },
    title: "Warriors vs Lakers",
    description: null,
    venue: "Chase Center",
    city: "San Francisco, CA",
    start_time: new Date(Date.now() + 1 * 86400_000).toISOString(),
    end_time: null,
    status: "scheduled",
    broadcast_info: "ESPN",
    score: null,
  },
];
