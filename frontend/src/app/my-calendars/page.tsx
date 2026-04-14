"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, ExternalLink } from "lucide-react";
import { fetchMyFeeds, fetchLeagues } from "@/lib/api";
import CalendarLinkModal from "@/components/calendar-link-modal";
import { useAuth } from "@/components/auth-provider";
import type { MyFeed, League } from "@/lib/types";

const SPORT_EMOJI: Record<string, string> = {
  motorsport: "🏎️",
  cricket: "🏏",
  american_football: "🏈",
  basketball: "🏀",
  soccer: "⚽",
};

function reminderLabel(minutes: number | null) {
  if (!minutes) return "No reminder";
  if (minutes === 60) return "1h before";
  return `${minutes}m before`;
}

export default function MyCalendarsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [feeds, setFeeds] = useState<MyFeed[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFeed, setActiveFeed] = useState<MyFeed | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/my-calendars`);
      return;
    }
    if (!authLoading && user) {
      Promise.all([fetchMyFeeds(), fetchLeagues()])
        .then(([f, l]) => { setFeeds(f); setLeagues(l); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  function leagueNamesForFeed(feed: MyFeed): string[] {
    return feed.league_ids
      .map((id) => leagues.find((l) => l.id === id))
      .filter(Boolean)
      .map((l) => l!.name);
  }

  function openModal(feed: MyFeed) {
    setActiveFeed(feed);
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--accent-muted)" }}
        >
          <CalendarDays size={22} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            My Calendars
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Your generated calendar feeds
          </p>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center border"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            You haven&apos;t created any calendar feeds yet.
          </p>
          <button
            onClick={() => router.push("/browse")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Browse Sports
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {feeds.map((feed) => {
            const names = leagueNamesForFeed(feed);
            const leagueObjs = feed.league_ids
              .map((id) => leagues.find((l) => l.id === id))
              .filter(Boolean) as League[];
            return (
              <div
                key={feed.feed_hash}
                className="rounded-2xl p-5 border"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* League chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {leagueObjs.map((l) => (
                    <span
                      key={l.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                    >
                      {SPORT_EMOJI[l.sport_type] ?? "🏅"} {l.name}
                    </span>
                  ))}
                  {names.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Custom selection
                    </span>
                  )}
                  {feed.team_ids.length > 0 && (
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: "var(--surface-hover)", color: "var(--muted)" }}
                    >
                      +{feed.team_ids.length} team{feed.team_ids.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "var(--muted)" }}>
                  <span>{feed.event_count} upcoming events</span>
                  <span>·</span>
                  <span>{reminderLabel(feed.reminder_minutes)}</span>
                  <span>·</span>
                  <span>Created {new Date(feed.created_at).toLocaleDateString()}</span>
                </div>

                {/* Action */}
                <button
                  onClick={() => openModal(feed)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  <ExternalLink size={14} /> Subscribe
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeFeed && (
        <CalendarLinkModal
          feed={activeFeed}
          lastSyncedAt={activeFeed.last_synced_at}
          lastSyncedEventCount={activeFeed.last_synced_event_count}
          onClose={() => setActiveFeed(null)}
        />
      )}
    </div>
  );
}
