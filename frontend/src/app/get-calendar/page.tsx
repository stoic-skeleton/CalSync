"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CalendarDays, Loader2, ArrowLeft } from "lucide-react";
import { createFeed } from "@/lib/api";
import CalendarLinkModal from "@/components/calendar-link-modal";
import type { FeedCreationResponse, League } from "@/lib/types";

// Placeholder data matching browse page placeholders
const PLACEHOLDER_LEAGUES: League[] = [
  { id: 1, name: "Formula 1", slug: "formula-1", sport_type: "motorsport",        country: "International", logo_url: null, event_count: 24 },
  { id: 2, name: "IPL",       slug: "ipl",       sport_type: "cricket",           country: "India",         logo_url: null, event_count: 74 },
  { id: 3, name: "NFL",       slug: "nfl",       sport_type: "american_football", country: "USA",           logo_url: null, event_count: 272 },
  { id: 4, name: "NBA",       slug: "nba",       sport_type: "basketball",        country: "USA",           logo_url: null, event_count: 1230 },
  { id: 5, name: "MLS",       slug: "mls",       sport_type: "soccer",            country: "USA/Canada",    logo_url: null, event_count: 378 },
];

const SPORT_EMOJI: Record<string, string> = {
  motorsport: "🏎️", cricket: "🏏", american_football: "🏈", basketball: "🏀", soccer: "⚽",
};

// Inner component that uses useSearchParams — must be inside <Suspense>
function BuildPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const leagueIds = (searchParams.get("leagues") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const teamIds = (searchParams.get("teams") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  const selectedLeagues = PLACEHOLDER_LEAGUES.filter((l) =>
    leagueIds.includes(l.id)
  );

  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<FeedCreationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);

  // No auto-generate on mount — we always show the reminder selector first
  // so users can choose a reminder before creating the feed.

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await createFeed({ league_ids: leagueIds, team_ids: teamIds, reminder_minutes: reminderMinutes });
      setFeed(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Could not reach backend: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const hasSelections = leagueIds.length > 0 || teamIds.length > 0;

  return (
    <div
      className="flex-1 px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm mb-8 hover:text-[var(--foreground)] transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <ArrowLeft size={15} /> Back to Browse
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-muted)" }}
          >
            <CalendarDays size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            Build Your Calendar
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            We generate a unique .ics feed URL that auto-updates whenever schedules change.
          </p>
        </div>

        {/* Selection summary */}
        {hasSelections ? (
          <div
            className="rounded-2xl p-5 mb-8 border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "var(--muted)" }}
            >
              Your selections
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedLeagues.map((l) => (
                <span
                  key={l.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {SPORT_EMOJI[l.sport_type]} {l.name}
                </span>
              ))}
              {teamIds.length > 0 && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: "var(--surface-hover)", color: "var(--muted)" }}
                >
                  +{teamIds.length} team{teamIds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 mb-8 text-center border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              No sports selected yet.
            </p>
            <button
              onClick={() => router.push("/browse")}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Browse Sports
            </button>
          </div>
        )}

        {/* Generate button */}
        {hasSelections && !feed && (
          <div className="text-center">
            {/* Reminder selector */}
            <div className="mb-4 flex items-center justify-center gap-3">
              <label className="text-sm" style={{ color: "var(--muted)" }}>Reminder:</label>
              <div className="inline-flex gap-2">
                <button onClick={() => setReminderMinutes(null)} className={`px-3 py-1 rounded-xl text-sm ${reminderMinutes===null?"bg-[var(--accent)] text-white":"bg-[var(--surface)]"}`}>None</button>
                <button onClick={() => setReminderMinutes(15)} className={`px-3 py-1 rounded-xl text-sm ${reminderMinutes===15?"bg-[var(--accent)] text-white":"bg-[var(--surface)]"}`}>15m</button>
                <button onClick={() => setReminderMinutes(30)} className={`px-3 py-1 rounded-xl text-sm ${reminderMinutes===30?"bg-[var(--accent)] text-white":"bg-[var(--surface)]"}`}>30m</button>
                <button onClick={() => setReminderMinutes(60)} className={`px-3 py-1 rounded-xl text-sm ${reminderMinutes===60?"bg-[var(--accent)] text-white":"bg-[var(--surface)]"}`}>60m</button>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Generating…</>
              ) : (
                <><CalendarDays size={18} /> Generate Calendar Link</>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--surface)", color: "var(--muted)" }}>
            <p className="text-red-400 font-mono mb-1">{error}</p>
            <p className="font-mono text-xs">API URL: {process.env.NEXT_PUBLIC_API_URL ?? "(not set — using localhost fallback)"}</p>
          </div>
        )}

        {/* How it works reminder */}
        {!hasSelections && (
          <div
            className="mt-6 rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--surface-hover)", color: "var(--muted)" }}
          >
            <strong style={{ color: "var(--foreground)" }}>How it works: </strong>
            Select leagues or teams on the Browse page → come here → get a unique
            .ics URL → paste it into Google Calendar, Apple Calendar, or Outlook.
            Your calendar will auto-refresh whenever the schedule changes.
          </div>
        )}
      </div>

      {/* Modal */}
      {feed && (
        <CalendarLinkModal
          feed={feed}
          onClose={() => setFeed(null)}
        />
      )}
    </div>
  );
}

// Exported page wraps the inner component in Suspense (required for useSearchParams)
export default function BuildPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center" style={{ background: "var(--background)" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      }
    >
      <BuildPageInner />
    </Suspense>
  );
}
