/**
 * Date helpers shared by the public site and the admin. Backend timestamps
 * are UTC without a timezone marker ("2026-09-25T12:10:31.093988").
 */

/** Parses a backend timestamp as UTC (adds the missing "Z", trims microseconds to ms). */
export function parseApiDate(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1");
  return new Date(hasZone ? trimmed : `${trimmed}Z`);
}

/**
 * One fixed time zone for every date on the public site, so a post published
 * late in the evening (US time) doesn't show tomorrow's date. The audience is
 * mainly in the US, hence US Eastern.
 */
export const SITE_TIME_ZONE = "America/New_York";

const siteDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SITE_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Sep 25, 2026" in SITE_TIME_ZONE, from a backend timestamp. */
export function formatSiteDate(value: string): string {
  return siteDateFormatter.format(parseApiDate(value));
}

/** ISO 8601 with "Z", for <time dateTime>, Open Graph and JSON-LD. */
export function toIsoDate(value: string): string {
  return parseApiDate(value).toISOString();
}
