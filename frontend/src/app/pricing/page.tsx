import React from "react";
import Link from "next/link";
import { Check, X, Zap, Users, CalendarDays } from "lucide-react";
import PricingCta from "@/components/pricing-cta";
import FreemiumUpgradeBanner from "@/components/freemium-upgrade-banner";

export const metadata = {
  title: "Pricing — CalSync",
  description: "Simple, transparent pricing for CalSync. Start free and upgrade for more leagues and faster refresh rates.",
};

const PLANS: Array<{
  name: string;
  price: string;
  period: string;
  tagline: string;
  popular?: boolean;
  ctaKey: "free" | "pro" | "team";
  icon: React.ReactNode;
  features: { text: string; included: boolean }[];
}> = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Perfect for casual fans",
    ctaKey: "free",
    icon: <CalendarDays size={20} />,
    features: [
      { text: "Up to 3 leagues per feed", included: true },
      { text: "Whole-league calendar feeds", included: true },
      { text: "Refreshed every 6 hours", included: true },
      { text: "Works with any .ics app", included: true },
      { text: "Individual team filtering", included: false },
      { text: "Match reminder events (–1 hr)", included: false },
      { text: "Hourly schedule refresh", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$4",
    period: "/ month",
    tagline: "For the die-hard fan",
    popular: true,
    ctaKey: "pro",
    icon: <Zap size={20} />,
    features: [
      { text: "Unlimited leagues", included: true },
      { text: "Whole-league calendar feeds", included: true },
      { text: "Refreshed every hour", included: true },
      { text: "Works with any .ics app", included: true },
      { text: "Individual team filtering", included: true },
      { text: "Match reminder events (–1 hr)", included: true },
      { text: "Hourly schedule refresh", included: true },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Team",
    price: "$12",
    period: "/ month",
    tagline: "For clubs, newsrooms & more",
    ctaKey: "team",
    icon: <Users size={20} />,
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Up to 20 team members", included: true },
      { text: "Real-time refresh (15 min)", included: true },
      { text: "Works with any .ics app", included: true },
      { text: "Individual team filtering", included: true },
      { text: "Match reminder events (–1 hr)", included: true },
      { text: "Custom feed branding", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Is the free plan really free forever?",
    a: "Yes. No credit card required. You can create calendar feeds for up to 3 leagues with no time limit.",
  },
  {
    q: "What calendars does this work with?",
    a: "Any app that supports .ics subscriptions — Google Calendar, Apple Calendar, Outlook, Fantastical, Thunderbird, and more.",
  },
  {
    q: "How does the calendar stay updated?",
    a: "We poll official sources (ESPN, TheSportsDB, CricAPI, etc.) on a schedule. Free accounts refresh every 6 hours; Pro every hour; Team every 15 minutes. Your calendar app then picks up the changes automatically.",
  },
  {
    q: "What counts as one league?",
    a: "Each competition counts as one league — e.g. Formula 1, IPL, NFL, NBA, or MLS each count as one.",
  },
  {
    q: "Can I cancel at any time?",
    a: "Yes. Pro and Team are billed monthly. Cancel any time and you keep access until the end of your billing cycle.",
  },
];

export default function PricingPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
  return (
    <div className="flex flex-col flex-1" style={{ background: "var(--background)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Freemium upgrade banner — only visible when logged in as freemium */}
      <FreemiumUpgradeBanner />

      {/* ── Header ── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(108, 71, 255, 0.15) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-2xl">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6"
            style={{
              background: "var(--accent-muted)",
              color: "var(--accent)",
              border: "1px solid var(--accent-muted)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Simple, transparent pricing
          </span>
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Plans for every fan
          </h1>
          <p className="text-lg" style={{ color: "var(--muted)" }}>
            Start free. Upgrade when you need more leagues or faster updates.
          </p>
        </div>
      </section>

      {/* ── Plans grid ── */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid sm:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="relative flex flex-col rounded-2xl border overflow-hidden"
                style={{
                  borderColor: plan.popular ? "var(--accent)" : "var(--border)",
                  background: "var(--surface)",
                  boxShadow: plan.popular
                    ? "0 0 0 2px var(--accent), 0 8px 32px rgba(108,71,255,0.15)"
                    : "var(--shadow)",
                }}
              >
                {plan.popular && (
                  <div
                    className="text-center text-xs font-bold py-1.5 tracking-wide"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    MOST POPULAR
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  {/* Plan header */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "var(--accent-muted)", color: "var(--accent)" }}
                  >
                    {plan.icon}
                  </div>
                  <p className="font-bold text-lg mb-1" style={{ color: "var(--foreground)" }}>
                    {plan.name}
                  </p>
                  <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-6">
                    <span
                      className="text-4xl font-extrabold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      {plan.period}
                    </span>
                  </div>

                  {/* CTA */}
                  <PricingCta plan={plan.ctaKey} />

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5 text-sm">
                        {f.included ? (
                          <Check
                            size={15}
                            className="flex-shrink-0 mt-0.5"
                            style={{ color: "var(--success)" }}
                          />
                        ) : (
                          <X
                            size={15}
                            className="flex-shrink-0 mt-0.5"
                            style={{ color: "var(--border)" }}
                          />
                        )}
                        <span
                          style={{
                            color: f.included ? "var(--foreground)" : "var(--muted)",
                          }}
                        >
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Trust note */}
          <p className="text-center text-sm mt-8" style={{ color: "var(--muted)" }}>
            No credit card required for Free plan. Pro & Team billed monthly. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        className="px-4 py-20"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto max-w-2xl">
          <h2
            className="text-2xl font-bold text-center mb-10"
            style={{ color: "var(--foreground)" }}
          >
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl p-5 border"
                style={{ borderColor: "var(--border)", background: "var(--background)" }}
              >
                <p className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  {item.q}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="px-4 py-20">
        <div
          className="mx-auto max-w-3xl rounded-3xl p-12 text-center"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--accent-muted)",
          }}
        >
          <h2
            className="text-3xl font-extrabold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Start for free today
          </h2>
          <p className="mb-8" style={{ color: "var(--muted)" }}>
            Pick your leagues, get your link, and sync in under two minutes.
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
