"use client";

import Link from "next/link";
import { Zap, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";

/**
 * Shown at the top of the pricing page (and optionally other pages)
 * only when the user is logged in as freemium.
 * Dismissible for the current session via local state.
 */
export default function FreemiumUpgradeBanner() {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed || !user || user.tier !== "freemium") return null;

  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between gap-4 text-sm"
      style={{
        background: "linear-gradient(90deg, var(--accent-muted) 0%, rgba(108,71,255,0.08) 100%)",
        borderBottom: "1px solid var(--accent)",
      }}
    >
      <div className="flex items-center gap-2.5" style={{ color: "var(--accent)" }}>
        <Zap size={15} className="shrink-0" />
        <span>
          You&rsquo;re on the <strong>Free plan</strong> — limited to 3 leagues per calendar feed.
          Upgrade to <strong>Pro</strong> for unlimited leagues, hourly refresh, and team filtering.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/upgrade"
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          Upgrade — $4/mo
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="p-1 rounded hover:bg-[var(--surface-hover)] transition-colors"
          style={{ color: "var(--muted)" }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
