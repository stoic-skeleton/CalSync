"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Menu, X, CalendarDays, LogOut, User, ChevronDown, ShieldCheck } from "lucide-react";
import ThemeToggle from "./theme-toggle";
import { useAuth } from "./auth-provider";

const NAV_LINKS = [
  { href: "/browse", label: "Browse" },
  { href: "/schedule", label: "Schedule" },
  { href: "/pricing", label: "Pricing" },
  { href: "/get-calendar", label: "Get Calendar" },
];

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  admin:    { label: "Admin",   color: "var(--danger)"  },
  pro:      { label: "Pro",     color: "var(--accent)"  },
  freemium: { label: "Free",    color: "var(--muted)"   },
};

function TierBadge({ tier }: { tier: string }) {
  const t = TIER_BADGE[tier] ?? { label: tier, color: "var(--muted)" };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: "var(--surface-hover)", color: t.color, border: `1px solid ${t.color}` }}
    >
      {t.label}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="hidden md:inline-block px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  const displayName = user.name || user.email;

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
      >
        {/* Avatar */}
        <span
          className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white select-none"
          style={{ background: "var(--accent)" }}
          aria-hidden
        >
          {user.picture_url
            ? <img src={user.picture_url} alt={initials} className="w-8 h-8 rounded-full object-cover" />
            : initials}
        </span>
        <span className="text-sm font-medium text-[var(--foreground)] max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className="text-[var(--muted)]" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl py-1 z-50"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {/* User info header */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)] truncate">{displayName}</p>
              <TierBadge tier={user.tier} />
            </div>
            <p className="text-xs text-[var(--muted)] truncate mt-0.5">{user.email}</p>
          </div>

          {/* Admin link */}
          {user.tier === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ShieldCheck size={15} style={{ color: "var(--danger)" }} />
              Admin dashboard
            </Link>
          )}

          {/* Profile */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <User size={15} className="text-[var(--muted)]" />
            Profile
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: "var(--danger)" }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleMobileLogout() {
    setOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl select-none">
          <CalendarDays
            size={22}
            style={{ color: "var(--accent)" }}
            strokeWidth={2.2}
          />
          <span style={{ color: "var(--foreground)" }}>
            Cal<span style={{ color: "var(--accent)" }}>Sync</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-[var(--accent)] bg-[var(--accent-muted)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {l.label}
            </Link>
          ))}

          {/* Mobile auth section */}
          <div style={{ borderTop: "1px solid var(--border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
            {user ? (
              <>
                <div className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{user.name || user.email}</p>
                    <p className="text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                  <TierBadge tier={user.tier} />
                </div>
                {user.tier === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  >
                    <ShieldCheck size={15} style={{ color: "var(--danger)" }} />
                    Admin dashboard
                  </Link>
                )}
                <button
                  onClick={handleMobileLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface-hover)]"
                  style={{ color: "var(--danger)" }}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
