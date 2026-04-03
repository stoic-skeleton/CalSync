"use client";

import { useState, useEffect } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import SportFilter from "@/components/sport-filter";
import EventCard from "@/components/event-card";
import { fetchUpcomingEvents } from "@/lib/api";
import type { Event } from "@/lib/types";

export default function SchedulePage() {
  const [sport, setSport] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(sportFilter: string) {
    setLoading(true);
    try {
      const res = await fetchUpcomingEvents(50);
      const filtered = sportFilter ? res.filter(e => e.league.sport_type === sportFilter) : res;
      setEvents(
        filtered.length > 0
          ? filtered
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
  }

  useEffect(() => { load(sport); }, [sport]);

  // Group events by date
  const grouped: Record<string, Event[]> = {};
  for (const ev of events) {
    const date = new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date(ev.start_time));
    (grouped[date] ??= []).push(ev);
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
          <button
            onClick={() => load(sport)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-[var(--surface-hover)] disabled:opacity-50"
            style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filter */}
        <div className="mb-8">
          <SportFilter value={sport} onChange={setSport} />
        </div>

        {/* Events */}
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
        ) : Object.keys(grouped).length === 0 ? (
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
