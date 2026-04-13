import type {
  League,
  Team,
  Event,
  FeedCreationRequest,
  FeedCreationResponse,
  PaginatedResponse,
  User,
  LoginResponse,
  AdminStats,
  AdminUsersResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "calsync_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: init?.credentials ?? "same-origin",
    ...init,
    headers,
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

export function fetchUpcomingEvents(limit = 20, sport?: string): Promise<Event[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (sport) qs.set("sport", sport);
  return apiFetch(`/api/events/upcoming?${qs}`);
}

// ── Feeds ──────────────────────────────────────────────────────────────────

export function createFeed(body: FeedCreationRequest): Promise<FeedCreationResponse> {
  return apiFetch("/api/feeds", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(body),
  });
}

// ── Auth ───────────────────────────────────────────────────────────────────

export type RegisterPayload = { email: string; password: string; name?: string };
export type LoginPayload = { email: string; password: string };

export function registerUser(payload: RegisterPayload) {
  return apiFetch<User>("/api/auth/register", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

export function logoutUser() {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function fetchCurrentUser() {
  return apiFetch<User>("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });
}


// ── Admin API ─────────────────────────────────────────────────────────────

export function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/api/admin/stats", { method: "GET", credentials: "include" });
}

export function fetchAdminUsers(page = 1, pageSize = 20): Promise<AdminUsersResponse> {
  const qs = `?page=${page}&page_size=${pageSize}`;
  return apiFetch<AdminUsersResponse>(`/api/admin/users${qs}`, { method: "GET", credentials: "include" });
}

export function updateAdminUser(userId: number, payload: { tier?: string; is_active?: boolean }) {
  return apiFetch<User>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify(payload),
  });
}
