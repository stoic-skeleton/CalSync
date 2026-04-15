"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  CalendarDays,
  ExternalLink,
  Smartphone,
  Loader2,
} from "lucide-react";
import { cn, copyToClipboard, toGoogleCalendarUrl, toOutlookUrl, toWebcalUrl } from "@/lib/utils";
import { addFeedToGoogle } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import type { FeedCreationResponse } from "@/lib/types";

interface CalendarLinkModalProps {
  feed: FeedCreationResponse;
  lastSyncedAt?: string | null;
  lastSyncedEventCount?: number | null;
  onClose: () => void;
}

const PLATFORMS = [
  {
    id: "google",
    label: "Google Calendar",
    icon: "🗓️",
    getUrl: (feed: FeedCreationResponse) => toGoogleCalendarUrl(feed.feed_url),
    hintDefault: "Opens Google Calendar — click Add to subscribe",
    hintAndroid: "Opens in your browser — tap Add to subscribe (syncs to app)",
  },
  {
    id: "apple",
    label: "Apple Calendar",
    icon: "🍎",
    getUrl: (feed: FeedCreationResponse) => toWebcalUrl(feed.feed_url),
    hintDefault: "Opens Apple Calendar subscription dialog on Mac/iPhone",
    hintAndroid: "Opens Apple Calendar subscription dialog on Mac/iPhone",
  },
  {
    id: "outlook",
    label: "Outlook",
    icon: "📧",
    getUrl: (feed: FeedCreationResponse) => toOutlookUrl(feed.feed_url),
    hintDefault: "Opens Outlook.com calendar — click Subscribe",
    hintAndroid: "Opens Outlook.com calendar — click Subscribe",
  },
];

export default function CalendarLinkModal({ feed, lastSyncedAt, lastSyncedEventCount, onClose }: CalendarLinkModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [directAdding, setDirectAdding] = useState(false);
  const [directResult, setDirectResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSyncedAt ?? null);
  const [syncedCount, setSyncedCount] = useState<number | null>(lastSyncedEventCount ?? null);
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const canDirectAdd = !!(user?.google_id);

  function formatSyncTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(feed.feed_url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDirectAdd() {
    setDirectAdding(true);
    setDirectResult(null);
    try {
      const res = await addFeedToGoogle(feed.feed_hash);
      setDirectResult(res);
      if (res.ok) {
        if (res.last_synced_at) setSyncedAt(res.last_synced_at);
        if (res.last_synced_event_count != null) setSyncedCount(res.last_synced_event_count);
        // Auto-dismiss success after 4s so button reappears for re-sync
        setTimeout(() => setDirectResult(null), 4000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDirectResult({ ok: false, message: msg.includes("403") ? "Calendar permission not granted. Please sign out and sign in with Google again." : msg });
    } finally {
      setDirectAdding(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)" }}
          >
            <CalendarDays size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: "var(--foreground)" }}>
              Your Calendar Feed
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {feed.event_count} events · auto-updates
            </p>
          </div>
        </div>

        {/* Feed URL */}
        <div
          className="flex items-center gap-2 rounded-xl p-3 mb-5"
          style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}
        >
          <code
            className="flex-1 text-xs truncate font-mono"
            style={{ color: "var(--foreground)" }}
          >
            {feed.feed_url}
          </code>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              copied
                ? "bg-green-500/15 text-green-400"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            )}
          >
            {copied ? (
              <><Check size={13} /> Copied</>
            ) : (
              <><Copy size={13} /> Copy</>
            )}
          </button>
        </div>

        {/* Direct Google Calendar add — only for Google-signed-in users */}
        {canDirectAdd && (
          <div className="mb-5">
            {/* Last synced info */}
            {syncedAt && !directResult && (
              <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
                Last synced {formatSyncTime(syncedAt)}
                {syncedCount != null ? ` · ${syncedCount} events` : ""}
              </p>
            )}
            {directResult ? (
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-xl p-3 text-sm",
                  directResult.ok
                    ? "bg-green-500/10 text-green-400 border border-green-500/30"
                    : "bg-red-500/10 text-red-400 border border-red-500/30"
                )}
              >
                {directResult.ok ? <Check size={16} /> : <X size={16} />}
                {directResult.message}
              </div>
            ) : (
              <button
                onClick={handleDirectAdd}
                disabled={directAdding}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] disabled:opacity-60"
                style={{ borderColor: "var(--border)" }}
              >
                {directAdding ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                    <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.09-6.09C34.46 3.09 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.08 5.5C12.4 13.67 17.73 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.99-2.22 5.52-4.73 7.22l7.25 5.63C43.44 37.42 46.52 31.4 46.52 24.5z"/>
                    <path fill="#FBBC05" d="M10.72 28.28A14.6 14.6 0 0 1 9.5 24c0-1.48.25-2.91.72-4.28l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.87.93 7.52 2.56 10.75l8.16-6.47z"/>
                    <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.49-4.94l-7.25-5.63c-1.81 1.21-4.13 1.93-6.24 1.93-6.27 0-11.6-4.17-13.28-9.72l-8.16 6.47C7.07 41.52 14.82 47 24 47z"/>
                  </svg>
                )}
                <span style={{ color: "var(--foreground)" }}>
                  {directAdding
                    ? "Syncing to Google Calendar…"
                    : syncedAt
                    ? "Sync again with Google Calendar"
                    : "Add directly to Google Calendar"}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Platform buttons */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
          Add to your calendar
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {PLATFORMS.map((p) => (
            <div key={p.id}>
              <a
                href={p.getUrl(feed)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-muted)] group"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-xl w-7 flex-shrink-0 text-center">{p.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{p.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {isAndroid ? p.hintAndroid : p.hintDefault}
                  </p>
                </div>
                <ExternalLink size={14} style={{ color: "var(--muted)" }} className="group-hover:text-[var(--accent)] transition-colors" />
              </a>
              {/* Android: secondary webcal:// link as fallback for native calendar apps */}
              {isAndroid && p.id === "google" && (
                <a
                  href={toWebcalUrl(feed.feed_url)}
                  className="flex items-center gap-2 px-4 py-2 text-xs rounded-xl border mt-1 transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-muted)]"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  <span>📅</span>
                  <span>Or try direct subscribe (opens native calendar app)</span>
                </a>
              )}
            </div>
          ))}
        </div>
        {/* Localhost dev warning */}
        {feed.feed_url.includes("localhost") && (
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 text-xs mb-2"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--foreground)" }}
          >
            <span className="text-base flex-shrink-0">⚠️</span>
            <span>
              <strong>Local dev:</strong> Google Calendar and Outlook subscribe via their servers, so they
              can&apos;t reach <code>localhost</code>. Use <strong>Apple Calendar</strong> (webcal opens on your device)
              or copy the URL and import manually. To test Google Calendar, expose port 8000 with{" "}
              <strong>ngrok</strong>.
            </span>
          </div>
        )}
        {/* Mobile QR note */}
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 text-xs"
          style={{ background: "var(--accent-muted)", color: "var(--muted)" }}
        >
          <Smartphone size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
          {isAndroid ? (
            <span>
              Tap <strong>Google Calendar</strong> above — it opens in your browser, tap <strong>Add</strong>, and the calendar will sync to your Google Calendar app.
            </span>
          ) : (
            <span>
              On iPhone, tap <strong>Apple Calendar</strong> to subscribe directly in the app.
              On Android, tap <strong>Google Calendar</strong> — it opens in your browser, tap Add to subscribe.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
