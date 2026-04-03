import type {
  League,
  Team,
  Event,
  FeedCreationRequest,
  FeedCreationResponse,
  PaginatedResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Leagues ────────────────────────────────────────────────────────────────

export function fetchLeagues(sport?: string): Promise<League[]> {
  const qs = sport ? `?sport=${encodeURIComponent(sport)}` : "";
  return apiFetch<League[]>(`/api/leagues${qs}`);
}

export function fetchLeague(slug: string): Promise<League & { teams: Team[] }> {
  return apiFetch(`/api/leagues/${slug}`);
}

// ── Teams ──────────────────────────────────────────────────────────────────

export function fetchTeam(slug: string): Promise<Team & { upcoming_events: Event[] }> {
  return apiFetch(`/api/teams/${slug}`);
}

// ── Events ─────────────────────────────────────────────────────────────────

export function fetchEvents(params: {
  league?: string;
  team?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Event>> {
  const qs = new URLSearchParams();
  if (params.league) qs.set("league", params.league);
  if (params.team) qs.set("team", params.team);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.page) qs.set("page", String(params.page));
  if (params.page_size) qs.set("page_size", String(params.page_size));
  const q = qs.toString();
  return apiFetch(`/api/events${q ? `?${q}` : ""}`);
}

export function fetchUpcomingEvents(limit = 20): Promise<Event[]> {
  return apiFetch(`/api/events/upcoming?limit=${limit}`);
}

// ── Feeds ──────────────────────────────────────────────────────────────────

export function createFeed(body: FeedCreationRequest): Promise<FeedCreationResponse> {
  return apiFetch("/api/feeds", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
