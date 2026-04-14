"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Globe, Zap } from "lucide-react";
import SportFilter, { SelectionBar } from "@/components/sport-filter";
import LeagueCard from "@/components/league-card";
import TeamCard from "@/components/team-card";
import { fetchLeagues, fetchLeague } from "@/lib/api";
import type { League, Team } from "@/lib/types";
import { useAuth } from "@/components/auth-provider";

const FREEMIUM_LEAGUE_LIMIT = 3;

// Map country strings → display region group
function toRegion(country: string | null): string {
  if (!country) return "Global";
  const c = country.toLowerCase();
  if (c.includes("international") || c.includes("global") || c === "international") return "Global";
  if (c.includes("india")) return "India";
  if (c.includes("usa") || c.includes("canada") || c.includes("united states")) return "North America";
  if (c.includes("uk") || c.includes("england") || c.includes("united kingdom")) return "United Kingdom";
  if (c.includes("europe") || c.includes("spain") || c.includes("germany") || c.includes("france") || c.includes("italy")) return "Europe";
  if (c.includes("australia")) return "Australia";
  return country;
}

export default function BrowsePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isFreemium = !user || user.tier === "freemium";
  const [sport, setSport] = useState("");
  const [region, setRegion] = useState("");
  const [search, setSearch] = useState("");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitBannerLeague, setLimitBannerLeague] = useState<string | null>(null);

  // Expanded league + teams
  const [expandedLeague, setExpandedLeague] = useState<
    (League & { teams: Team[] }) | null
  >(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Selections
  const [selectedLeagues, setSelectedLeagues] = useState<League[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchLeagues(sport || undefined)
      .then(setLeagues)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sport]);

  const handleExpandLeague = useCallback(async (league: League) => {
    if (expandedLeague?.id === league.id) {
      setExpandedLeague(null);
      return;
    }
    setTeamsLoading(true);
    try {
      const data = await fetchLeague(league.slug);
      setExpandedLeague(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTeamsLoading(false);
    }
  }, [expandedLeague]);

  function toggleLeague(league: League) {
    setSelectedLeagues((prev) => {
      if (prev.find((l) => l.id === league.id)) {
        setLimitBannerLeague(null);
        return prev.filter((l) => l.id !== league.id);
      }
      // Enforce freemium cap
      if (isFreemium && prev.length >= FREEMIUM_LEAGUE_LIMIT) {
        setLimitBannerLeague(league.name);
        return prev; // don't add
      }
      setLimitBannerLeague(null);
      return [...prev, league];
    });
  }

  function toggleTeam(team: Team) {
    setSelectedTeams((prev) =>
      prev.find((t) => t.id === team.id)
        ? prev.filter((t) => t.id !== team.id)
        : [...prev, team]
    );
  }

  function handleBuild() {
    const leagueIds = selectedLeagues.map((l) => l.id).join(",");
    const teamIds = selectedTeams.map((t) => t.id).join(",");
    const qs = new URLSearchParams();
    if (leagueIds) qs.set("leagues", leagueIds);
    if (teamIds) qs.set("teams", teamIds);
    router.push(`/get-calendar?${qs.toString()}`);
  }

  const sourceLeagues: League[] =
    leagues.length > 0 ? leagues : PLACEHOLDER_LEAGUES;

  // Build filtered list
  const filtered = sourceLeagues.filter((l) => {
    const matchesSport = !sport || l.sport_type === sport;
    const matchesRegion = !region || toRegion(l.country) === region;
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase());
    return matchesSport && matchesRegion && matchesSearch;
  });

  // Available regions from the current sport-filtered list
  const allRegions = Array.from(
    new Set(sourceLeagues
      .filter((l) => !sport || l.sport_type === sport)
      .map((l) => toRegion(l.country))
    )
  ).sort();

  const totalSelected = selectedLeagues.length + selectedTeams.length;

  // Group filtered leagues by region for display
  const grouped: Record<string, League[]> = {};
  for (const l of filtered) {
    const r = toRegion(l.country);
    (grouped[r] ??= []).push(l);
  }
  const groupOrder = Object.keys(grouped).sort();

  return (
    <div
      className="flex-1 px-4 py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            Browse Sports
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Filter by sport, country, or search. Select leagues or individual teams.
          </p>
        </div>

        {/* Freemium upgrade banner */}
        {isFreemium && (
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-6 text-sm"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--accent)" }}
          >
            <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
              <Zap size={15} />
              <span>
                {user
                  ? <>You&rsquo;re on the <strong>Free plan</strong> &mdash; up to {FREEMIUM_LEAGUE_LIMIT} leagues per calendar feed.</>
                  : <>Free plan includes up to <strong>{FREEMIUM_LEAGUE_LIMIT} leagues</strong>. Sign in to save your feed.</>}
              </span>
            </div>
            <a
              href="/pricing"
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: "var(--accent)" }}
            >
              {user ? "Upgrade to Pro →" : "See plans →"}
            </a>
          </div>
        )}

        {/* Hard-cap warning when user tries to exceed limit */}
        {limitBannerLeague && (
          <div
            className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", color: "var(--danger)" }}
          >
            <span>
              Can&rsquo;t add <strong>{limitBannerLeague}</strong> &mdash; Free plan is limited to {FREEMIUM_LEAGUE_LIMIT} leagues. Remove one first or upgrade.
            </span>
            <a
              href="/pricing"
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: "var(--danger)" }}
            >
              Upgrade
            </a>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Sport filter */}
          <SportFilter value={sport} onChange={(v) => { setSport(v); setRegion(""); }} />

          {/* Region filter pills */}
          {allRegions.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
                <Globe size={12} /> Region:
              </span>
              <button
                onClick={() => setRegion("")}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={
                  region === ""
                    ? { background: "var(--foreground)", color: "var(--background)" }
                    : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }
                }
              >
                All
              </button>
              {allRegions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r === region ? "" : r)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={
                    region === r
                      ? { background: "var(--foreground)", color: "var(--background)" }
                      : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted)" }}
            />
            <input
              type="text"
              placeholder="Search leagues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 ring-[var(--accent)]"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>

        {/* League grid — grouped by region */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-2xl animate-pulse"
                style={{ background: "var(--surface)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--muted)" }}>
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No leagues found</p>
            <p className="text-sm mt-1">Try a different sport or region filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {groupOrder.map((grp) => (
              <div key={grp}>
                {/* Region heading — only shown when multiple groups visible */}
                {groupOrder.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <Globe size={14} style={{ color: "var(--muted)" }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                      {grp}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {grouped[grp].length} {grouped[grp].length === 1 ? "league" : "leagues"}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {grouped[grp].map((league) => {
                    const isSelected = !!selectedLeagues.find((l) => l.id === league.id);
                    const isExpanded = expandedLeague?.id === league.id;
                    return (
                      <div key={league.id} className="flex flex-col gap-2">
                        <div onClick={() => handleExpandLeague(league)} className="cursor-pointer">
                          <LeagueCard
                            league={league}
                            selected={isSelected}
                            onToggle={toggleLeague}
                          />
                        </div>

                        {/* Teams panel */}
                        {isExpanded && (
                          <div
                            className="rounded-xl p-3 flex flex-col gap-2"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <p
                              className="text-xs font-semibold mb-1"
                              style={{ color: "var(--muted)" }}
                            >
                              Teams — pick individual teams or add whole league above
                            </p>
                            {teamsLoading ? (
                              <div className="h-8 rounded animate-pulse" style={{ background: "var(--surface-hover)" }} />
                            ) : expandedLeague?.teams.length ? (
                              expandedLeague.teams.map((team) => (
                                <TeamCard
                                  key={team.id}
                                  team={team}
                                  selected={!!selectedTeams.find((t) => t.id === team.id)}
                                  onToggle={toggleTeam}
                                />
                              ))
                            ) : (
                              <p className="text-xs" style={{ color: "var(--muted)" }}>
                                No teams data yet.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky bottom selection bar */}
      <SelectionBar
        count={totalSelected}
        leagueCount={selectedLeagues.length}
        tier={user?.tier ?? null}
        onClear={() => { setSelectedLeagues([]); setSelectedTeams([]); setLimitBannerLeague(null); }}
        onBuild={handleBuild}
      />
    </div>
  );
}

// Shown when backend is not yet running, so UI is always visible
const PLACEHOLDER_LEAGUES: League[] = [
  { id: 1, name: "Formula 1",           slug: "formula-1",        sport_type: "motorsport",        country: "International", logo_url: null, event_count: 24 },
  { id: 2, name: "IPL",                  slug: "ipl",               sport_type: "cricket",           country: "India",         logo_url: null, event_count: 74 },
  { id: 3, name: "NFL",                  slug: "nfl",               sport_type: "american_football", country: "USA",           logo_url: null, event_count: 272 },
  { id: 4, name: "NBA",                  slug: "nba",               sport_type: "basketball",        country: "USA",           logo_url: null, event_count: 1230 },
  { id: 5, name: "MLS",                  slug: "mls",               sport_type: "soccer",            country: "USA/Canada",    logo_url: null, event_count: 378 },
  { id: 6, name: "FIFA World Cup",       slug: "fifa-world-cup",    sport_type: "soccer",            country: "International", logo_url: null, event_count: 104 },
];

