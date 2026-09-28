import "server-only";

import type { AdminEnrollment, AdminStudent } from "./admin-data";
import { toEnrollmentRow, whatsappHref, type EnrollmentRow } from "./admin-enrollments";
import { formatAdminDate, parseApiDate } from "./admin-format";
import { isEnrollmentStatus, type EnrollmentStatus } from "./enrollment";

export const STUDENTS_PATH = "/admin/students";
export const STUDENTS_PAGE_SIZE = 25;

export type StudentSort = "newest" | "oldest" | "name";

export const SORT_OPTIONS: { key: StudentSort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "name", label: "Name A–Z" },
];

export interface StudentsQuery {
  q: string;
  sort: StudentSort;
  page: number;
  view: number | null;
  /** ?edit=1 opens the sheet straight into edit mode (the row menu's "Edit details"). */
  edit: boolean;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isSort = (v: string): v is StudentSort => v === "newest" || v === "oldest" || v === "name";

/** Never throws: anything unknown falls back to the defaults. */
export function parseStudentsQuery(params: RawParams): StudentsQuery {
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page), 10);
  const view = Number.parseInt(first(params.view), 10);
  const hasView = Number.isFinite(view) && view > 0;
  return {
    q: first(params.q).trim().slice(0, 100),
    sort: isSort(sort) ? sort : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    view: hasView ? view : null,
    edit: hasView && first(params.edit) === "1",
  };
}

/** URL for this page with defaults omitted, so links stay short and shareable. */
export function studentsHref(query: Partial<StudentsQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.view) params.set("view", String(query.view));
  if (query.view && query.edit) params.set("edit", "1");
  const qs = params.toString();
  return qs ? `${STUDENTS_PATH}?${qs}` : STUDENTS_PATH;
}

/**
 * Case-insensitive match on name, email, AOA number (full or digits) and
 * country; phones are compared digits-only so "0300 765" finds "03007654321".
 */
export function matchesStudentSearch(s: AdminStudent, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if ([s.name, s.email, s.registration_no, s.country ?? ""].some((f) => f.toLowerCase().includes(needle))) {
    return true;
  }
  const digits = q.replace(/\D/g, "");
  return (
    digits.length >= 3 &&
    [s.phone, s.whatsapp].some((n) => (n ?? "").replace(/\D/g, "").includes(digits))
  );
}

export function sortStudents(list: AdminStudent[], sort: StudentSort): AdminStudent[] {
  const time = (s: AdminStudent) => parseApiDate(s.created_at).getTime();
  return [...list].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.id - b.id;
    if (sort === "oldest") return time(a) - time(b) || a.id - b.id;
    return time(b) - time(a) || b.id - a.id;
  });
}

export type StatusMix = Partial<Record<EnrollmentStatus, number>>;

/** Serializable list row. `enrollments` is null when GET /admin/enrollments failed. */
export interface StudentRow {
  id: number;
  name: string;
  email: string;
  registrationNo: string;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  joined: string;
  enrollments: { total: number; mix: StatusMix } | null;
}

/** Groups enrollments by student id once, for the whole page. */
export function enrollmentsByStudent(list: AdminEnrollment[] | null): Map<number, AdminEnrollment[]> | null {
  if (!list) return null;
  const map = new Map<number, AdminEnrollment[]>();
  for (const e of list) {
    const bucket = map.get(e.student.id);
    if (bucket) bucket.push(e);
    else map.set(e.student.id, [e]);
  }
  return map;
}

export function toStudentRow(s: AdminStudent, byStudent: Map<number, AdminEnrollment[]> | null): StudentRow {
  let enrollments: StudentRow["enrollments"] = null;
  if (byStudent) {
    const own = byStudent.get(s.id) ?? [];
    const mix: StatusMix = {};
    for (const e of own) if (isEnrollmentStatus(e.status)) mix[e.status] = (mix[e.status] ?? 0) + 1;
    enrollments = { total: own.length, mix };
  }
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    registrationNo: s.registration_no,
    phone: s.phone,
    whatsapp: s.whatsapp ?? null,
    country: s.country,
    joined: formatAdminDate(parseApiDate(s.created_at)),
    enrollments,
  };
}

export interface StudentDetail extends StudentRow {
  whatsappHref: string | null;
  /** Newest first; null when enrollment data is unavailable. */
  enrollmentRows: EnrollmentRow[] | null;
}

export function toStudentDetail(s: AdminStudent, byStudent: Map<number, AdminEnrollment[]> | null): StudentDetail {
  const own = byStudent ? [...(byStudent.get(s.id) ?? [])] : null;
  own?.sort((a, b) => parseApiDate(b.enrolled_at).getTime() - parseApiDate(a.enrolled_at).getTime() || b.id - a.id);
  return {
    ...toStudentRow(s, byStudent),
    // Prefers the WhatsApp number when the student gave one.
    whatsappHref: whatsappHref(s.whatsapp || s.phone),
    enrollmentRows: own ? own.map(toEnrollmentRow) : null,
  };
}
