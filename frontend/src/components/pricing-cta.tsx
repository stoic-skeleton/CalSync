"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

interface PricingCtaProps {
  plan: "free" | "pro" | "team";
}

/**
 * Auth-aware CTA button for each pricing plan.
 * - Free:  logged-out → "Get started free"  |  freemium → "You're on this plan"  |  pro/admin → "Downgrade" (noop)
 * - Pro:   logged-out → "Sign up for Pro"   |  freemium → "Upgrade to Pro"       |  pro → "You're on this plan"
 * - Team:  always → "Contact us"
 */
export default function PricingCta({ plan }: PricingCtaProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="w-full py-3 rounded-xl mb-6 animate-pulse"
        style={{ background: "var(--surface-hover)", height: "48px" }}
      />
    );
  }

  if (plan === "team") {
    return (
      <a
        href="mailto:hello@calsync.app"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mb-6"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        Contact Us
      </a>
    );
  }

  if (plan === "free") {
    if (user?.tier === "freemium") {
      return (
        <div
          className="flex items-center justify-center w-full py-3 rounded-xl font-semibold text-sm mb-6"
          style={{ background: "var(--surface-hover)", color: "var(--muted)", border: "1.5px solid var(--border)" }}
        >
          ✓ Your current plan
        </div>
      );
    }
    return (
      <Link
        href="/browse"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mb-6"
        style={{ background: "transparent", color: "var(--foreground)", border: "1.5px solid var(--border)" }}
      >
        Get started free
      </Link>
    );
  }

  // Pro plan
  if (user?.tier === "pro" || user?.tier === "admin") {
    return (
      <div
        className="flex items-center justify-center w-full py-3 rounded-xl font-semibold text-sm mb-6"
        style={{ background: "var(--surface-hover)", color: "var(--muted)", border: "1.5px solid var(--accent)" }}
      >
        ✓ Your current plan
      </div>
    );
  }

  if (user?.tier === "freemium") {
    // Logged-in freemium → upgrade
    return (
      <Link
        href="/upgrade"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mb-6"
        style={{ background: "var(--accent)", color: "white", boxShadow: "0 4px 16px rgba(108,71,255,0.35)" }}
      >
        Upgrade to Pro →
      </Link>
    );
  }

  // Logged out → sign up (no "Start Free Trial" wording)
  return (
    <Link
      href="/register?next=/pricing"
      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mb-6"
      style={{ background: "var(--accent)", color: "white", boxShadow: "0 4px 16px rgba(108,71,255,0.35)" }}
    >
      Sign up for Pro
    </Link>
  );
}
