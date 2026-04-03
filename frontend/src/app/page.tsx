import Link from "next/link";
import { CalendarDays, Zap, RefreshCw, Globe } from "lucide-react";

const LEAGUES = [
  { name: "Formula 1", emoji: "🏎️", color: "#e10600", events: "24 races" },
  { name: "IPL", emoji: "🏏", color: "#0066b3", events: "74 matches" },
  { name: "NFL", emoji: "🏈", color: "#d50a0a", events: "272 games" },
  { name: "NBA", emoji: "🏀", color: "#c9082a", events: "1230 games" },
  { name: "MLS", emoji: "⚽", color: "#00a650", events: "378 games" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Pick your sports",
    desc: "Browse leagues and teams. Select the ones you want to follow — F1, IPL, NFL, and more.",
    icon: "🏆",
  },
  {
    step: "2",
    title: "Get your link",
    desc: "We generate a unique .ics feed URL for exactly your selections. No account needed.",
    icon: "🔗",
  },
  {
    step: "3",
    title: "Subscribe once",
    desc: "Paste the link into Google Calendar, Apple Calendar, or Outlook. Events sync automatically forever.",
    icon: "📅",
  },
];

const FEATURES = [
  {
    icon: <Zap size={18} />,
    title: "Auto-updating",
    desc: "Schedule changes, postponements, and cancellations reflect automatically in your calendar.",
  },
  {
    icon: <RefreshCw size={18} />,
    title: "Always accurate",
    desc: "We refresh from official sources every 6 hours, with live checks on matchdays.",
  },
  {
    icon: <Globe size={18} />,
    title: "Works everywhere",
    desc: "Google Calendar, Apple Calendar, Outlook, Android, iPhone — any app that supports .ics subscriptions.",
  },
  {
    icon: <CalendarDays size={18} />,
    title: "Rich event details",
    desc: "Every event includes venue, city, broadcast channel, and a direct link to the official match page.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1" style={{ background: "var(--background)" }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(108, 71, 255, 0.18) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-3xl">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
            style={{
              background: "var(--accent-muted)",
              color: "var(--accent)",
              border: "1px solid var(--accent-muted)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Free · No account needed · Works everywhere
          </span>
          <h1
            className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-5"
            style={{ color: "var(--foreground)" }}
          >
            Never miss a game{" "}
            <span style={{ color: "var(--accent)" }}>again.</span>
          </h1>
          <p
            className="text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            Sync F1, IPL, NFL, NBA, MLS and more directly into your calendar.
            Auto-updating, free, and it works everywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "var(--accent)",
                boxShadow: "0 4px 24px rgba(108, 71, 255, 0.4)",
              }}
            >
              <CalendarDays size={18} />
              Browse Sports
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:bg-[var(--surface-hover)]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* ── Leagues strip ─────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-8" style={{ color: "var(--muted)" }}>
            Supported Leagues
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {LEAGUES.map((l) => (
              <Link
                key={l.name}
                href="/browse"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:scale-[1.03] hover:shadow-md"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${l.color}20` }}
                >
                  {l.emoji}
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {l.name}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {l.events}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="px-4 py-20"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14" style={{ color: "var(--foreground)" }}>
            Three steps, five minutes
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "var(--background)", border: "2px solid var(--border)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <p className="font-bold text-lg mb-2" style={{ color: "var(--foreground)" }}>
                    {item.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "var(--foreground)" }}>
            Everything you need
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 rounded-2xl border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                    {f.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <div
          className="mx-auto max-w-3xl rounded-3xl p-12 text-center"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--accent-muted)",
          }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "var(--foreground)" }}>
            Ready to sync?
          </h2>
          <p className="mb-8 text-lg" style={{ color: "var(--muted)" }}>
            Pick your leagues, get a link, and subscribe. Free forever.
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--accent)" }}
          >
            <CalendarDays size={20} />
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}

