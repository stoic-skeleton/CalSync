"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ── LogoImage ─────────────────────────────────────────────────────────────
// A next/image wrapper that swaps in `fallback` on load error.
// Must live in a "use client" file because it uses onError.

interface LogoImageProps {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
}

export function LogoImage({
  src,
  alt,
  fallback,
  width = 40,
  height = 40,
  className = "object-contain",
}: LogoImageProps) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) return <>{fallback ?? null}</>;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}

const SPORTS = [
  { value: "", label: "All Sports", emoji: "🏆" },
  { value: "motorsport", label: "Motorsport", emoji: "🏎️" },
  { value: "cricket", label: "Cricket", emoji: "🏏" },
  { value: "american_football", label: "Football", emoji: "🏈" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "soccer", label: "Soccer", emoji: "⚽" },
];

interface SportFilterProps {
  value: string;
  onChange: (v: string) => void;
}

export default function SportFilter({ value, onChange }: SportFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SPORTS.map((s) => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all",
            value === s.value
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          )}
        >
          <span>{s.emoji}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Selection bar displayed at bottom of browse page ──────────────────────

interface SelectionBarProps {
  count: number;
  leagueCount: number;
  tier: string | null; // null = loading / logged out
  onClear: () => void;
  onBuild: () => void;
}

const FREEMIUM_LEAGUE_LIMIT = 3;

export function SelectionBar({ count, leagueCount, tier, onClear, onBuild }: SelectionBarProps) {
  if (count === 0) return null;

  const isFreemium = !tier || tier === "freemium";
  const atLimit = isFreemium && leagueCount >= FREEMIUM_LEAGUE_LIMIT;
  const overLimit = isFreemium && leagueCount > FREEMIUM_LEAGUE_LIMIT;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
      {/* Upgrade nudge — shown above the bar when at/over limit */}
      {atLimit && (
        <div
          className="mb-2 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm"
          style={{
            background: "var(--accent-muted)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
          }}
        >
          <span className="font-medium">
            {overLimit
              ? `Free plan allows max ${FREEMIUM_LEAGUE_LIMIT} leagues — remove ${leagueCount - FREEMIUM_LEAGUE_LIMIT} to continue`
              : `Free plan: ${leagueCount}/${FREEMIUM_LEAGUE_LIMIT} leagues used`}
          </span>
          <a
            href="/pricing"
            className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            Upgrade →
          </a>
        </div>
      )}

      <div
        className="flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: overLimit ? "var(--danger)" : "var(--accent)" }}
          >
            {count}
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {count === 1 ? "1 selection" : `${count} selections`}
          </span>
          {isFreemium && leagueCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: overLimit ? "rgba(239,68,68,0.15)" : "var(--surface-hover)",
                color: overLimit ? "var(--danger)" : "var(--muted)",
              }}
            >
              {leagueCount}/{FREEMIUM_LEAGUE_LIMIT} leagues
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: "var(--muted)" }}
            aria-label="Clear selections"
          >
            <X size={16} />
          </button>
          <button
            onClick={onBuild}
            disabled={overLimit}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)" }}
          >
            Get Calendar →
          </button>
        </div>
      </div>
    </div>
  );
}
