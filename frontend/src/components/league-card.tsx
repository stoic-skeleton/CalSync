"use client";

import Link from "next/link";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoImage } from "@/components/sport-filter";
import type { League } from "@/lib/types";

const SPORT_COLORS: Record<string, string> = {
  motorsport: "#e10600",
  cricket: "#0066b3",
  american_football: "#d50a0a",
  basketball: "#c9082a",
  soccer: "#00a650",
};

const SPORT_EMOJI: Record<string, string> = {
  motorsport: "🏎️",
  cricket: "🏏",
  american_football: "🏈",
  basketball: "🏀",
  soccer: "⚽",
};

interface LeagueCardProps {
  league: League;
  selected?: boolean;
  onToggle?: (league: League) => void;
  /** If true, renders as a link to /browse/[slug] instead */
  asLink?: boolean;
}

export default function LeagueCard({
  league,
  selected = false,
  onToggle,
  asLink = false,
}: LeagueCardProps) {
  const accentColor = SPORT_COLORS[league.sport_type] ?? "var(--accent)";

  const content = (
    <div
      className={cn(
        "relative group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-200",
        selected
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-md"
      )}
      style={{ boxShadow: selected ? `0 0 0 1px var(--accent)` : undefined }}
    >
      {/* Sport colour strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-70"
        style={{ background: accentColor }}
      />

      {/* Logo + badge */}
      <div className="flex items-start justify-between mt-1">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[var(--surface-hover)] overflow-hidden"
        >
          {league.logo_url ? (
            <LogoImage
              src={league.logo_url}
              alt={league.name}
              width={48}
              height={48}
              className="object-contain"
              fallback={<span>{SPORT_EMOJI[league.sport_type] ?? "🏆"}</span>}
            />
          ) : (
            <span>{SPORT_EMOJI[league.sport_type] ?? "🏆"}</span>
          )}
        </div>

        {onToggle && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(league);
            }}
            aria-label={selected ? "Remove" : "Add"}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
              selected
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-hover)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-white"
            )}
          >
            {selected ? <Check size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
          </button>
        )}
      </div>

      {/* Text */}
      <div>
        <p className="font-semibold text-sm leading-snug" style={{ color: "var(--foreground)" }}>
          {league.name}
        </p>
        {league.country && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {league.country}
          </p>
        )}
      </div>

      {/* Event count */}
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {league.event_count} upcoming events
      </p>
    </div>
  );

  if (asLink) {
    return <Link href={`/browse/${league.slug}`}>{content}</Link>;
  }
  return content;
}
