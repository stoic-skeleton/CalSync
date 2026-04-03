/** API response types — mirrors backend Pydantic schemas */

export type SportType =
  | "motorsport"
  | "cricket"
  | "american_football"
  | "basketball"
  | "soccer";

export type EventStatus =
  | "scheduled"
  | "live"
  | "completed"
  | "postponed"
  | "cancelled";

export interface League {
  id: number;
  name: string;
  slug: string;
  sport_type: SportType;
  country: string | null;
  logo_url: string | null;
  event_count: number;
}

export interface Team {
  id: number;
  league_id: number;
  name: string;
  slug: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
}

export interface Event {
  id: number;
  league: Pick<League, "id" | "name" | "slug" | "sport_type" | "logo_url">;
  home_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  start_time: string; // ISO 8601 UTC
  end_time: string | null;
  status: EventStatus;
  broadcast_info: string | null;
  score: string | null;
}

export interface FeedCreationRequest {
  league_ids: number[];
  team_ids: number[];
}

export interface FeedCreationResponse {
  feed_hash: string;
  feed_url: string;
  webcal_url: string;
  event_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface Selection {
  leagues: League[];
  teams: Team[];
}
