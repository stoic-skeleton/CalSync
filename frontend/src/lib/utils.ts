import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a UTC ISO date string into the user's local timezone */
export function formatEventTime(
  isoString: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  }).format(new Date(isoString));
}

/** Format a date to a relative string like "in 2 days" or "3 hours ago" */
export function formatRelative(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  const abs = Math.abs(diff);
  const future = diff > 0;

  if (abs < 60_000) return "now";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(abs / 86_400_000);
  return future ? `in ${d}d` : `${d}d ago`;
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Build a webcal:// URL from an https:// URL */
export function toWebcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, "webcal://");
}

/** Build a Google Calendar subscribe URL */
export function toGoogleCalendarUrl(feedUrl: string): string {
  const encoded = encodeURIComponent(feedUrl);
  return `https://calendar.google.com/calendar/r?cid=${encoded}`;
}

/** Build an Outlook subscribe URL */
export function toOutlookUrl(feedUrl: string): string {
  const encoded = encodeURIComponent(feedUrl);
  return `https://outlook.office.com/calendar/addcalendar?url=${encoded}`;
}

/** Truncate a string to maxLen characters */
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}
