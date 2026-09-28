import "server-only";

import { adminDayNumber, formatDayNumber, mondayOf, parseApiDate } from "./admin-format";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many timestamps fall within the last `days` × 24h (an exact rolling window). */
export function countWithinLastDays(timestamps: string[], days: number, now = new Date()): number {
  const cutoff = now.getTime() - days * DAY_MS;
  return timestamps.filter((t) => parseApiDate(t).getTime() > cutoff).length;
}

export interface WeekBucket {
  /** "Sep 14" — the Monday that starts the week. */
  label: string;
  count: number;
  isCurrent: boolean;
}

/**
 * Counts per calendar week (Monday–Sunday, admin time zone) for the last
 * `weeks` weeks, oldest first; the last bucket is the current week.
 */
export function weeklyCounts(timestamps: string[], weeks: number, now = new Date()): WeekBucket[] {
  const currentMonday = mondayOf(adminDayNumber(now));
  const firstMonday = currentMonday - (weeks - 1) * 7;
  const counts = new Array<number>(weeks).fill(0);

  for (const t of timestamps) {
    const index = Math.floor((adminDayNumber(parseApiDate(t)) - firstMonday) / 7);
    if (index >= 0 && index < weeks) counts[index] += 1;
  }

  return counts.map((count, i) => ({
    label: formatDayNumber(firstMonday + i * 7),
    count,
    isCurrent: i === weeks - 1,
  }));
}
