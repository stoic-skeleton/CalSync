"use client";

import { MapPin, Tv, Clock } from "lucide-react";
import { cn, formatEventTime, formatRelative } from "@/lib/utils";
import type { Event } from "@/lib/types";

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  scheduled: { label: "Upcoming",  classes: "bg-blue-500/10 text-blue-400" },
  live:       { label: "LIVE",      classes: "bg-green-500/15 text-green-400 animate-pulse" },
  completed:  { label: "Final",     classes: "bg-[var(--surface-hover)] text-[var(--muted)]" },
  postponed:  { label: "Postponed", classes: "bg-yellow-500/10 text-yellow-500" },
  cancelled:  { label: "Cancelled", classes: "bg-red-500/10 text-red-400 line-through" },
};

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const status = STATUS_STYLES[event.status] ?? STATUS_STYLES.scheduled;
  const hasTeams = event.home_team && event.away_team;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden transition-all duration-150",
        "hover:shadow-md border-[var(--border)] bg-[var(--surface)]",
        compact ? "px-4 py-3" : "px-5 py-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* League logo */}
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
          {event.league.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.league.logo_url} alt={event.league.name} width={32} height={32} className="object-contain" />
          ) : (
            <span className="text-sm">🏆</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              {event.league.name}
            </span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                status.classes
              )}
            >
              {status.label}
            </span>
          </div>

          {/* Teams or title */}
          {hasTeams ? (
            <div className="flex items-center gap-2 mt-2">
              {/* Home */}
              <TeamMini team={event.home_team!} />
              <span className="text-xs font-bold" style={{ color: "var(--muted)" }}>
                {event.score ?? "vs"}
              </span>
              {/* Away */}
              <TeamMini team={event.away_team!} />
            </div>
          ) : (
            <p className="mt-1 font-semibold text-sm leading-snug" style={{ color: "var(--foreground)" }}>
              {event.title}
            </p>
          )}

          {/* Meta row */}
          {!compact && (
            <div className="flex flex-wrap gap-3 mt-2">
              <MetaTag icon={<Clock size={12} />} label={formatEventTime(event.start_time)} />
              {event.venue && <MetaTag icon={<MapPin size={12} />} label={`${event.venue}${event.city ? ` · ${event.city}` : ""}`} />}
              {event.broadcast_info && (
                <span
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}
                >
                  <Tv size={11} />
                  Watch on {event.broadcast_info}
                </span>
              )}
            </div>
          )}

          {compact && (
            <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
              <Clock size={11} />
              {formatEventTime(event.start_time)}
              <span className="ml-1 opacity-60">({formatRelative(event.start_time)})</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamMini({ team }: { team: NonNullable<Event["home_team"]> }) {
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {team.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo_url} alt={team.name} width={20} height={20} className="object-contain flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded bg-[var(--surface-hover)] flex-shrink-0" />
      )}
      <span className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
        {team.short_name ?? team.name}
      </span>
    </div>
  );
}

function MetaTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
      {icon}
      {label}
    </span>
  );
}
