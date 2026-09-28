"use server";

import { revalidatePath } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { fieldFromError } from "@/lib/admin-errors";
import { isTrialRequestStatus } from "@/lib/trial-requests";

export type MutationResult = { ok: true } | { ok: false; notFound: boolean; message: string };

const NOT_FOUND = "This request no longer exists.";

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** Trial requests feed the dashboard; converting one also creates an enrollment (and maybe a student). */
function refreshAdminViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/trial-requests");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/students");
}

/** PATCH /admin/trial-requests/{id}/status — the backend enforces the allowed transitions (400 otherwise). */
export async function updateTrialRequestStatus(id: number, status: string): Promise<MutationResult> {
  if (!isValidId(id) || !isTrialRequestStatus(status)) {
    return { ok: false, notFound: false, message: "Invalid request." };
  }
  const res = await adminFetch(`/admin/trial-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  refreshAdminViews();
  if (res.ok) return { ok: true };
  return { ok: false, notFound: res.status === 404, message: res.status === 404 ? NOT_FOUND : res.message };
}

/** DELETE /admin/trial-requests/{id} (hard delete, 204). */
export async function deleteTrialRequest(id: number): Promise<MutationResult> {
  if (!isValidId(id)) return { ok: false, notFound: false, message: "Invalid request." };
  const res = await adminFetch(`/admin/trial-requests/${id}`, { method: "DELETE" });
  refreshAdminViews();
  if (res.ok) return { ok: true };
  return { ok: false, notFound: res.status === 404, message: res.status === 404 ? NOT_FOUND : res.message };
}

// ── Enroll this student ────────────────────────────────────────────────────

export type EnrollField = "name" | "email" | "phone" | "whatsapp" | "country" | "course_plan_id" | "preferred_time";
const ENROLL_FIELDS: readonly EnrollField[] = ["name", "email", "phone", "whatsapp", "country", "course_plan_id", "preferred_time"];

export interface EnrollInput {
  name: string;
  email: string;
  phone: string;
  /** Optional; empty means "same as phone" and isn't stored. */
  whatsapp?: string;
  country: string;
  course_plan_id: number;
  /** "HH:MM", the same value the public enrollment form sends. */
  preferred_time: string;
}

export type EnrollResult =
  | {
      ok: true;
      enrollmentId: number;
      registrationNo: string;
      /** Step (b): the new enrollment was set to Active. */
      activated: boolean;
      /** Step (c): the trial request was marked enrolled. */
      requestUpdated: boolean;
    }
  | {
      ok: false;
      /** Nothing was created (step (a) failed). */
      field?: EnrollField;
      /** 409: already enrolled in this plan. */
      conflict: boolean;
      message: string;
    };

interface CreatedEnrollment {
  id: number;
  student: { registration_no?: string | null };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Server-side re-check of what the form already validates. */
function validateEnroll(input: EnrollInput): { field: EnrollField; message: string } | null {
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!text(input.name)) return { field: "name", message: "Enter the student's name." };
  if (!EMAIL_RE.test(text(input.email))) return { field: "email", message: "Enter a valid email address." };
  if (!text(input.phone)) return { field: "phone", message: "Enter a phone number." };
  if (!text(input.country)) return { field: "country", message: "Enter the country." };
  if (!isValidId(input.course_plan_id)) return { field: "course_plan_id", message: "Choose a plan." };
  if (typeof input.preferred_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.preferred_time)) {
    return { field: "preferred_time", message: "Choose a class time." };
  }
  return null;
}

/**
 * Converts a trial request, in order:
 *   (a) POST /enrollments (the public endpoint, called from the server) —
 *       finds or creates the student by email and creates an on_trial
 *       enrollment. It carries the admin token so the backend doesn't count it
 *       against the public form's per-IP limit (all admin calls come from this
 *       server's IP). Any failure here stops everything.
 *   (b) PATCH /admin/enrollments/{id}/status → active (their trial is done).
 *   (c) PATCH /admin/trial-requests/{id}/status → enrolled.
 * Failures in (b) or (c) are reported, not rolled back.
 */
export async function enrollTrialRequest(trialRequestId: number, input: EnrollInput): Promise<EnrollResult> {
  if (!isValidId(trialRequestId)) return { ok: false, conflict: false, message: "Invalid request." };
  const invalid = validateEnroll(input);
  if (invalid) return { ok: false, conflict: false, ...invalid };

  const body = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    whatsapp: typeof input.whatsapp === "string" && input.whatsapp.trim() ? input.whatsapp.trim() : null,
    country: input.country.trim(),
    course_plan_id: input.course_plan_id,
    preferred_time: input.preferred_time,
  };

  // (a)
  const created = await adminFetch<CreatedEnrollment>("/enrollments", { method: "POST", body: JSON.stringify(body) });
  if (!created.ok) {
    if (created.status === 409) {
      return { ok: false, conflict: true, message: "This student is already enrolled in this plan." };
    }
    if (created.status === 404) {
      return { ok: false, conflict: false, field: "course_plan_id", message: "This plan no longer exists. Choose another." };
    }
    const field = fieldFromError(created.status, created.detail, created.message, ENROLL_FIELDS);
    return { ok: false, conflict: false, field, message: created.message.replace(/^Value error, /, "") };
  }
  const enrollmentId = created.data.id;

  // (b)
  const activated = await adminFetch(`/admin/enrollments/${enrollmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  });

  // (c)
  const marked = await adminFetch(`/admin/trial-requests/${trialRequestId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "enrolled" }),
  });

  refreshAdminViews();
  return {
    ok: true,
    enrollmentId,
    registrationNo: created.data.student.registration_no ?? "",
    activated: activated.ok,
    requestUpdated: marked.ok,
  };
}
