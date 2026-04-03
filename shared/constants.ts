/**
 * Shared constants used by both frontend and backend.
 * Frontend imports these directly; backend has a Python mirror at backend/app/shared/constants.py
 */

// Sport types
export const SPORT_TYPES = {
  MOTORSPORT: "motorsport",
  CRICKET: "cricket",
  AMERICAN_FOOTBALL: "american_football",
  BASKETBALL: "basketball",
  SOCCER: "soccer",
} as const;

export type SportType = (typeof SPORT_TYPES)[keyof typeof SPORT_TYPES];

// League slugs (must match DB slugs)
export const LEAGUE_SLUGS = {
  F1: "formula-1",
  IPL: "ipl",
  NFL: "nfl",
  NBA: "nba",
  MLS: "mls",
} as const;

export type LeagueSlug = (typeof LEAGUE_SLUGS)[keyof typeof LEAGUE_SLUGS];

// Event statuses
export const EVENT_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  COMPLETED: "completed",
  POSTPONED: "postponed",
  CANCELLED: "cancelled",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

// F1 session types
export const F1_SESSION_TYPES = {
  RACE: "race",
  QUALIFYING: "qualifying",
  SPRINT: "sprint",
  SPRINT_QUALIFYING: "sprint_qualifying",
  PRACTICE_1: "practice_1",
  PRACTICE_2: "practice_2",
  PRACTICE_3: "practice_3",
} as const;

// Sport display metadata
export const SPORT_META: Record<
  SportType,
  { label: string; emoji: string; color: string }
> = {
  motorsport: { label: "Motorsport", emoji: "🏎️", color: "#E10600" },
  cricket: { label: "Cricket", emoji: "🏏", color: "#0066B3" },
  american_football: { label: "American Football", emoji: "🏈", color: "#D50A0A" },
  basketball: { label: "Basketball", emoji: "🏀", color: "#C9082A" },
  soccer: { label: "Soccer", emoji: "⚽", color: "#00A650" },
};
