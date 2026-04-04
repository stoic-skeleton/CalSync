import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";

const LINKS = [
  { group: "Product", items: [
    { label: "Browse Calendars", href: "/browse" },
    { label: "Upcoming Schedule", href: "/schedule" },
    { label: "Get Calendar Link", href: "/get-calendar" },
  ]},
  { group: "Sports", items: [
    { label: "Formula 1", href: "/browse?sport=motorsport" },
    { label: "IPL", href: "/browse?sport=cricket" },
    { label: "NFL", href: "/browse?sport=american_football" },
    { label: "NBA", href: "/browse?sport=basketball" },
    { label: "MLS", href: "/browse?sport=soccer" },
  ]},
  { group: "About", items: [
    { label: "About CalSync", href: "/#how-it-works" },
    { label: "How It Works", href: "/#how-it-works" },
  ]},
];

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-3">
              <CalendarDays size={20} style={{ color: "var(--accent)" }} strokeWidth={2.2} />
              <span>
                Cal<span style={{ color: "var(--accent)" }}>Sync</span>
              </span>
            </Link>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Never miss a game again. Sports schedules, synced to your calendar.
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm hover:text-[var(--foreground)] transition-colors"
              style={{ color: "var(--muted)" }}
            >
              <ExternalLink size={15} /> Open Source on GitHub
            </a>
          </div>

          {/* Link groups */}
          {LINKS.map((g) => (
            <div key={g.group}>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--muted)" }}
              >
                {g.group}
              </p>
              <ul className="space-y-2">
                {g.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm hover:text-[var(--foreground)] transition-colors"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <span>© {new Date().getFullYear()} CalSync. Free and open source.</span>
          <span>Built with ❤️ for sports fans</span>
        </div>
      </div>
    </footer>
  );
}
