"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  CalendarDays,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { cn, copyToClipboard, toGoogleCalendarUrl, toOutlookUrl, toWebcalUrl } from "@/lib/utils";
import type { FeedCreationResponse } from "@/lib/types";

interface CalendarLinkModalProps {
  feed: FeedCreationResponse;
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

export default function CalendarLinkModal({ feed, onClose }: CalendarLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  async function handleCopy() {
    const ok = await copyToClipboard(feed.feed_url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl"
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
