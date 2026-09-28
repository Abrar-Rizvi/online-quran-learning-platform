import "server-only";

import { parseApiDate } from "./dates";

export { parseApiDate };

/**
 * Admin date helpers. Backend timestamps are UTC without a timezone marker
 * ("2026-09-25T12:10:31.093988"); everything is displayed — and bucketed by
 * calendar day/week — in ADMIN_TIME_ZONE (IANA name, default "UTC").
 */

function resolveTimeZone(value: string | undefined): string {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

export const ADMIN_TIME_ZONE = resolveTimeZone(process.env.ADMIN_TIME_ZONE);

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Sep 23, 2026" in the admin time zone. */
export function formatAdminDate(date: Date): string {
  return dateFormatter.format(date);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Sep 23, 2026, 4:05 PM" in the admin time zone. */
export function formatAdminDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** The admin-time-zone calendar day of `date`, as a whole number of days since 1970-01-01. */
export function adminDayNumber(date: Date): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return Math.floor(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / DAY_MS,
  );
}

/** Day number of the Monday that starts the week containing `dayNumber`. */
export function mondayOf(dayNumber: number): number {
  // 1970-01-01 was a Thursday: (day + 3) % 7 is 0 on Mondays.
  return dayNumber - ((dayNumber + 3) % 7);
}

const shortDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

/** "Sep 14" for a day number (already a calendar day, so formatted in UTC). */
export function formatDayNumber(dayNumber: number): string {
  return shortDayFormatter.format(new Date(dayNumber * DAY_MS));
}
