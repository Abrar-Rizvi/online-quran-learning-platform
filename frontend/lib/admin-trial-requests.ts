import "server-only";

import type { AdminStudent, AdminTrialRequest } from "./admin-data";
import type { CourseListItem, FeePlanItem } from "./api";
import { whatsappHref } from "./admin-enrollments";
import { formatAdminDate, formatAdminDateTime, parseApiDate } from "./admin-format";
import { formatPlanLabel } from "./enrollment";
import { isTrialRequestStatus, normalizeEmail, type TrialRequestStatus } from "./trial-requests";

export const TRIAL_REQUESTS_PATH = "/admin/trial-requests";
export const TRIAL_REQUESTS_PAGE_SIZE = 25;

export type TrialTab = TrialRequestStatus | "all";

/** On trial first: it's the working list (and the default tab). */
export const TRIAL_TABS: { key: TrialTab; label: string }[] = [
  { key: "on_trial", label: "On trial" },
  { key: "enrolled", label: "Enrolled" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export interface TrialRequestsQuery {
  status: TrialTab;
  q: string;
  page: number;
  view: number | null;
  /** ?enroll=1 opens the sheet straight into the "Enroll this student" form (row menu). */
  enroll: boolean;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Never throws: no or unknown ?status → On trial; bad page → 1; bad view → none. */
export function parseTrialRequestsQuery(params: RawParams): TrialRequestsQuery {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  const view = Number.parseInt(first(params.view), 10);
  const hasView = Number.isFinite(view) && view > 0;
  return {
    status: status === "all" || isTrialRequestStatus(status) ? status : "on_trial",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: hasView ? view : null,
    enroll: hasView && first(params.enroll) === "1",
  };
}

/** URL for this page with defaults omitted (On trial is the default tab). */
export function trialRequestsHref(query: Partial<TrialRequestsQuery>): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "on_trial") params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.view) params.set("view", String(query.view));
  if (query.view && query.enroll) params.set("enroll", "1");
  const qs = params.toString();
  return qs ? `${TRIAL_REQUESTS_PATH}?${qs}` : TRIAL_REQUESTS_PATH;
}

/**
 * Case-insensitive match on name, email and country; WhatsApp numbers are
 * compared digits-only (at least 3 digits), like the Students search.
 */
export function matchesTrialSearch(r: AdminTrialRequest, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if ([r.name, r.email, r.country].some((f) => f.toLowerCase().includes(needle))) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length >= 3 && r.whatsapp.replace(/\D/g, "").includes(digits);
}

export function newestFirst(list: AdminTrialRequest[]): AdminTrialRequest[] {
  return [...list].sort(
    (a, b) => parseApiDate(b.created_at).getTime() - parseApiDate(a.created_at).getTime() || b.id - a.id,
  );
}

export function countByTrialStatus(list: AdminTrialRequest[]): Record<TrialTab, number> {
  const counts: Record<TrialTab, number> = { all: list.length, on_trial: 0, enrolled: 0, cancelled: 0 };
  for (const r of list) if (isTrialRequestStatus(r.status)) counts[r.status] += 1;
  return counts;
}

export interface StudentMatch {
  id: number;
  registrationNo: string;
}

/**
 * Display-only link to a student by normalized email (trial_requests stores
 * no student id). null when GET /admin/students failed.
 */
export function studentsByEmail(students: AdminStudent[] | null): Map<string, StudentMatch> | null {
  if (!students) return null;
  return new Map(students.map((s) => [normalizeEmail(s.email), { id: s.id, registrationNo: s.registration_no }]));
}

/** Serializable row (dates formatted on the server, in ADMIN_TIME_ZONE). */
export interface TrialRequestRow {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  whatsappHref: string | null;
  country: string;
  status: TrialRequestStatus;
  requested: string;
  requestedAt: string;
  student: StudentMatch | null;
}

export function toTrialRequestRow(r: AdminTrialRequest, byEmail: Map<string, StudentMatch> | null): TrialRequestRow {
  const created = parseApiDate(r.created_at);
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    whatsapp: r.whatsapp,
    whatsappHref: whatsappHref(r.whatsapp),
    country: r.country,
    status: r.status,
    requested: formatAdminDate(created),
    requestedAt: formatAdminDateTime(created),
    student: byEmail?.get(normalizeEmail(r.email)) ?? null,
  };
}

/** Course → plan choices for the enroll form (courses without plans are left out). */
export interface CourseOption {
  id: number;
  name: string;
  plans: { id: number; label: string }[];
}

export function toCourseOptions(courses: CourseListItem[], fees: FeePlanItem[]): CourseOption[] {
  return courses
    .map((c) => ({
      id: c.id,
      name: c.name,
      plans: fees
        .filter((f) => f.course_id === c.id)
        .sort((a, b) => a.days_per_week - b.days_per_week)
        .map((f) => ({ id: f.id, label: formatPlanLabel(f.days_per_week, f.fee, f.currency) })),
    }))
    .filter((c) => c.plans.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
