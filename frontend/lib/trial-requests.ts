/**
 * Trial-request statuses, mirroring TrialRequestStatus / TRIAL_REQUEST_TRANSITIONS
 * in backend/models/trial_request.py. Every new person starts on the academy's
 * 5-day trial; afterwards the request is enrolled or cancelled (both final).
 */

export type TrialRequestStatus = "on_trial" | "enrolled" | "cancelled";

export const TRIAL_REQUEST_STATUS_LABELS: Record<TrialRequestStatus, string> = {
  on_trial: "On trial",
  enrolled: "Enrolled",
  cancelled: "Cancelled",
};

export const TRIAL_REQUEST_TRANSITIONS: Record<TrialRequestStatus, readonly TrialRequestStatus[]> = {
  on_trial: ["enrolled", "cancelled"],
  enrolled: [],
  cancelled: [],
};

export function isTrialRequestStatus(value: unknown): value is TrialRequestStatus {
  return typeof value === "string" && Object.hasOwn(TRIAL_REQUEST_TRANSITIONS, value);
}

/** Same email rule as the backend's find-or-create student (trimmed, lower-cased). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
