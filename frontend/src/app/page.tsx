import Link from "next/link";
import { CalendarDays, Zap, RefreshCw, Globe, Tv, Star } from "lucide-react";
import { LogoImage } from "@/components/sport-filter";

export const metadata = {
  title: "CalSync — Sync Sports Schedules to Your Calendar",
  description:
    "Never miss a game. Sync F1, IPL, NFL, NBA & Premier League schedules into Google Calendar, Apple Calendar, or Outlook. Free, auto-updating .ics feeds.",
};

// ── Leagues shown on home page ────────────────────────────────────────────
const LEAGUES = [
  { name: "Formula 1",  logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/f1.png",    emoji: "🏎️", color: "#e10600", events: "24 races",   sport: "Motorsport",        country: "Global" },
  { name: "IPL",        logo_url: "https://www.google.com/s2/favicons?domain=iplt20.com&sz=256",    emoji: "🏏", color: "#0066b3", events: "74 matches", sport: "Cricket",           country: "India"  },
  { name: "NFL",        logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",   emoji: "🏈", color: "#d50a0a", events: "272 games",  sport: "American Football", country: "USA"    },
  { name: "NBA",        logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",   emoji: "🏀", color: "#c9082a", events: "1230 games", sport: "Basketball",        country: "USA"    },
  { name: "MLS",        logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/mls.png",   emoji: "⚽", color: "#00a650", events: "378 games",  sport: "Soccer",            country: "USA"    },
];

// ── Marquee: leagues fans follow ──────────────────────────────────────────
const MARQUEE_ITEMS = [
  { name: "Formula 1",      logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/f1.png",        emoji: "🏎️" },
  { name: "IPL",            logo_url: "https://www.google.com/s2/favicons?domain=iplt20.com&sz=256", emoji: "🏏" },
  { name: "NBA",            logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",        emoji: "🏀" },
  { name: "NFL",            logo_url: "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",        emoji: "🏈" },
  { name: "Premier League", logo_url: "https://a.espncdn.com/i/teamlogos/soccer/500/eng.1.png",       emoji: "⚽" },
];

// ── Calendar app compatibility ────────────────────────────────────────────
const CALENDAR_APPS = [
  { name: "Google Calendar", logo_url: "https://www.google.com/s2/favicons?domain=calendar.google.com&sz=256", icon: "📅", badge: "Works great" },
  { name: "Apple Calendar",  logo_url: "https://www.google.com/s2/favicons?domain=apple.com&sz=256",           icon: "🍎", badge: "Works great" },
  { name: "Outlook",         logo_url: "https://www.google.com/s2/favicons?domain=outlook.com&sz=256",         icon: "📧", badge: "Works great" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Pick your sports",
    desc: "Browse leagues and teams across cricket, football, motorsport, and more. Select exactly what you follow.",
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
    desc: "Every event includes venue, city, and broadcast channel so you know exactly where to watch.",
  },
  {
    icon: <Tv size={18} />,
    title: "Where to watch",
    desc: "Broadcast info is embedded directly in each calendar event — TNT, Sky Sports, Disney+ Hotstar, and more.",
  },
  {
    icon: <Star size={18} />,
    title: "Team-level filtering",
    desc: "Follow your favourite team only — not the whole league. Your calendar stays clean.",
  },
];

// ── Testimonials ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "Finally my Google Calendar shows every F1 race. Set it and forget it.",
    author: "Racing fan",
    league: "Formula 1 🏎️",
  },
  {
    quote: "The IPL schedule updates itself — even rescheduled games just appear.",
    author: "Cricket enthusiast",
    league: "IPL 🏏",
  },
  {
    quote: "I follow the Lakers and only get Lakers games. No clutter.",
    author: "NBA fan",
    league: "NBA 🏀",
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
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
            <Link href="/#how-it-works" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              How it works ↓
            </Link>
          </p>

          {/* Works with your calendars */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Works with</span>
            {[
              { name: "Google Calendar", logo_url: "https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64", icon: "📅" },
              { name: "Apple Calendar",  logo_url: "https://www.google.com/s2/favicons?domain=apple.com&sz=64",           icon: "🍎" },
              { name: "Outlook",         logo_url: "https://www.google.com/s2/favicons?domain=outlook.com&sz=64",         icon: "📧" },
            ].map((app) => (
              <span
                key={app.name}
                title={app.name}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <LogoImage src={app.logo_url} alt={app.name} width={20} height={20}
                  fallback={<span className="text-base">{app.icon}</span>} />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted by fans ───────────────────────────────────────────── */}
      <section
        className="px-4 py-16"
        style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <p
          className="text-center text-xs font-semibold uppercase tracking-widest mb-10"
          style={{ color: "var(--muted)" }}
        >
          Trusted by fans of
        </p>
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap justify-center gap-6">
            {MARQUEE_ITEMS.map((item) => (
              <Link
                key={item.name}
                href="/browse"
                className="flex flex-col items-center gap-3 group"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg"
                  style={{
                    background: "var(--background)",
                    border: "2px solid var(--border)",
                  }}
                >
                  <LogoImage
                    src={item.logo_url}
                    alt={item.name}
                    width={52}
                    height={52}
                    fallback={<span className="text-4xl">{item.emoji}</span>}
                  />
                </div>
                <span
                  className="text-sm font-semibold text-center"
                  style={{ color: "var(--foreground)" }}
                >
                  {item.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported leagues strip ────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p
            className="text-center text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            Browse by sport & country
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-10"
            style={{ color: "var(--foreground)" }}
          >
            Available leagues
          </h2>
          <div className="marquee-wrapper">
            <div className="marquee-track">
              {[...LEAGUES, ...LEAGUES, ...LEAGUES].map((l, i) => (
                <Link
                  key={i}
                  href="/browse"
                  className="flex flex-col items-center gap-2 mx-4 px-5 py-4 rounded-2xl border transition-all hover:scale-[1.03] hover:shadow-md group select-none"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", minWidth: 100 }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110"
                    style={{ background: `${l.color}20` }}
                  >
                    <LogoImage
                      src={l.logo_url}
                      alt={l.name}
                      width={48}
                      height={48}
                      fallback={<span className="text-2xl">{l.emoji}</span>}
                    />
                  </div>
                  <span className="text-sm font-semibold text-center whitespace-nowrap" style={{ color: "var(--foreground)" }}>
                    {l.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-6">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[var(--foreground)]"
              style={{ color: "var(--accent)" }}
            >
              View all leagues →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Supported calendars ───────────────────────────────────────── */}
      <section
        className="px-4 py-16"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto max-w-4xl">
          <p
            className="text-center text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--muted)" }}
          >
            Compatible with
          </p>
          <h2
            className="text-2xl font-bold text-center mb-10"
            style={{ color: "var(--foreground)" }}
          >
            Your calendar, your choice
          </h2>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {CALENDAR_APPS.map((app) => (
              <div
                key={app.name}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border text-center"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "var(--surface-hover)" }}
                >
                  <LogoImage
                    src={app.logo_url}
                    alt={app.name}
                    width={32}
                    height={32}
                    fallback={<span className="text-2xl">{app.icon}</span>}
                  />
                </div>
                <span className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
                  {app.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}
                >
                  {app.badge}
                </span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <p
            className="text-center text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}
          >
            How it works
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-14"
            style={{ color: "var(--foreground)" }}
          >
            Three steps, five minutes
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "var(--surface)", border: "2px solid var(--border)" }}
                >
                  {item.icon}
                  <span
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "var(--accent)" }}
                  >
                    {item.step}
                  </span>
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
      <section
        className="px-4 py-20"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-3xl font-bold text-center mb-12"
            style={{ color: "var(--foreground)" }}
          >
            Everything you need
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 rounded-2xl border"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
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

      {/* ── Social proof / testimonials ───────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <p
            className="text-center text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--muted)" }}
          >
            What fans say
          </p>
          <h2
            className="text-2xl font-bold text-center mb-10"
            style={{ color: "var(--foreground)" }}
          >
            Fans love CalSync
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="flex flex-col gap-4 p-5 rounded-2xl border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} fill="currentColor" style={{ color: "#f59e0b" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed italic" style={{ color: "var(--foreground)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-auto">
                  <p className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>
                    {t.author}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {t.league}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section
        className="px-4 pb-24"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="mx-auto max-w-3xl rounded-3xl p-12 text-center mt-20"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--accent-muted)",
          }}
        >
          <h2
            className="text-3xl sm:text-4xl font-extrabold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Ready to sync?
          </h2>
          <p className="mb-8 text-lg" style={{ color: "var(--muted)" }}>
            Pick your leagues, get a link, and subscribe. Free forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--accent)" }}
            >
              <CalendarDays size={20} />
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:bg-[var(--surface-hover)]"
              style={{
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

