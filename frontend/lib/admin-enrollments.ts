import "server-only";

import type { AdminEnrollment, AdminStudent } from "./admin-data";
import { formatAdminDate, parseApiDate } from "./admin-format";
import {
  formatPlanLabel,
  formatPreferredTime,
  isEnrollmentStatus,
  type EnrollmentStatus,
} from "./enrollment";

export const ENROLLMENTS_PATH = "/admin/enrollments";
export const ENROLLMENTS_PAGE_SIZE = 25;

export type StatusFilter = "all" | EnrollmentStatus;

export const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on_trial", label: "On trial" },
  { key: "active", label: "Active" },
  { key: "alumni", label: "Alumni" },
  { key: "cancelled", label: "Cancelled" },
];

export interface EnrollmentsQuery {
  status: StatusFilter;
  q: string;
  page: number;
  view: number | null;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Never throws: unknown status → "all", bad page → 1, bad view → none. */
export function parseEnrollmentsQuery(params: RawParams): EnrollmentsQuery {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  const view = Number.parseInt(first(params.view), 10);
  return {
    status: isEnrollmentStatus(status) ? status : "all",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: Number.isFinite(view) && view > 0 ? view : null,
  };
}

/** Builds a URL for this page, omitting defaults so links stay short and shareable. */
export function enrollmentsHref(query: Partial<EnrollmentsQuery>): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.view) params.set("view", String(query.view));
  const qs = params.toString();
  return qs ? `${ENROLLMENTS_PATH}?${qs}` : ENROLLMENTS_PATH;
}

/** Case-insensitive match on student name, email, AOA number (full or digits) and course. */
export function matchesSearch(e: AdminEnrollment, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [e.student.name, e.student.email, e.student.registration_no, e.course_name].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

export function newestFirst(list: AdminEnrollment[]): AdminEnrollment[] {
  return [...list].sort(
    (a, b) => parseApiDate(b.enrolled_at).getTime() - parseApiDate(a.enrolled_at).getTime() || b.id - a.id,
  );
}

export function countByStatus(list: AdminEnrollment[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: list.length, on_trial: 0, active: 0, alumni: 0, cancelled: 0 };
  for (const e of list) if (isEnrollmentStatus(e.status)) counts[e.status] += 1;
  return counts;
}

/** Serializable row for client components (labels are formatted on the server, in ADMIN_TIME_ZONE). */
export interface EnrollmentRow {
  id: number;
  studentId: number;
  name: string;
  email: string;
  registrationNo: string;
  course: string;
  plan: string;
  status: string;
  preferredTime: string | null;
  enrolled: string;
}

export function toEnrollmentRow(e: AdminEnrollment): EnrollmentRow {
  return {
    id: e.id,
    studentId: e.student.id,
    name: e.student.name,
    email: e.student.email,
    registrationNo: e.student.registration_no,
    course: e.course_name,
    plan: formatPlanLabel(e.days_per_week, e.fee, e.currency),
    status: e.status,
    preferredTime: formatPreferredTime(e.preferred_time),
    enrolled: formatAdminDate(parseApiDate(e.enrolled_at)),
  };
}

export interface StudentContact {
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  whatsappHref: string | null;
}

/**
 * wa.me needs a full international number, so a link is only offered when
 * the phone is written with a "+" or "00" prefix and has 8–15 digits.
 * A local number like "0300 1234567" gets no WhatsApp link.
 */
export function whatsappHref(phone: string | null): string | null {
  if (!phone || !/^\s*(\+|00)/.test(phone)) return null;
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export function contactFor(studentId: number, students: AdminStudent[] | null): StudentContact | null {
  if (!students) return null;
  const s = students.find((st) => st.id === studentId);
  if (!s) return { phone: null, whatsapp: null, country: null, whatsappHref: null };
  const whatsapp = s.whatsapp ?? null;
  // "Chat on WhatsApp" prefers the WhatsApp number, else the phone (same international-number rule).
  return { phone: s.phone, whatsapp, country: s.country, whatsappHref: whatsappHref(whatsapp || s.phone) };
}
