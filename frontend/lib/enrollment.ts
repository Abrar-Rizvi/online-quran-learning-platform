import { formatPrice } from "@/components/courses/pricing-card";
import { getPlanCopy } from "@/lib/courses";

/** Friendly labels for `Enrollment.status`, mirroring the backend's `EnrollmentStatus` enum values. */
export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  on_trial: "On Trial",
  active: "Active",
  cancelled: "Cancelled",
  alumni: "Alumni",
};

/** Falls back to the raw value for any status not in the map above. */
export function getEnrollmentStatusLabel(status: string): string {
  return ENROLLMENT_STATUS_LABELS[status] ?? status;
}

/** "14:30:00" (the backend's `time` serialization) -> "2:30 PM". Returns null for anything unparseable. */
export function formatPreferredTime(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

export type EnrollmentStatus = "on_trial" | "active" | "cancelled" | "alumni";

/**
 * Allowed status changes — mirrors STATUS_TRANSITIONS in backend/models/enrollment.py.
 * The UI only offers these; the backend stays the authority (it answers 400 otherwise).
 */
export const ENROLLMENT_STATUS_TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
  on_trial: ["active", "cancelled"],
  active: ["alumni", "cancelled"],
  cancelled: [],
  alumni: [],
};

export function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return typeof value === "string" && Object.hasOwn(ENROLLMENT_STATUS_TRANSITIONS, value);
}

export function getAllowedNextStatuses(status: string): readonly EnrollmentStatus[] {
  return isEnrollmentStatus(status) ? ENROLLMENT_STATUS_TRANSITIONS[status] : [];
}

/**
 * Compact plan label for admin lists: "Weekend · $32", "3 days/week · $45".
 * The 2-day plan's name comes from the same PLAN_COPY the public pricing cards use.
 */
export function formatPlanLabel(daysPerWeek: number, fee: number | string, currency: string): string {
  const name = daysPerWeek === 2 ? getPlanCopy(2).name : `${daysPerWeek} days/week`;
  const { symbol, amount } = formatPrice(typeof fee === "string" ? parseFloat(fee) : fee, currency);
  return `${name} · ${symbol}${amount}`;
}
