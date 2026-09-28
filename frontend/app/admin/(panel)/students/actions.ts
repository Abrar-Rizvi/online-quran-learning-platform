"use server";

import { revalidatePath } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { fieldFromError } from "@/lib/admin-errors";

export type StudentField = "name" | "email" | "phone" | "whatsapp" | "country";
export type StudentChanges = Partial<Record<StudentField, string>>;

export type StudentMutationResult =
  | { ok: true }
  | { ok: false; notFound: boolean; conflict: boolean; field?: StudentField; message: string };

const NOT_FOUND = "This student no longer exists.";
const FIELDS: readonly StudentField[] = ["name", "email", "phone", "whatsapp", "country"];

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** Names and emails also appear on the Enrollments page and the Dashboard. */
function refreshAdminViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/enrollments");
}

/**
 * PATCH /admin/students/{id} with only the changed fields. An empty phone or
 * country is sent as "" and the backend stores null. registration_no is never
 * sent (the backend ignores it anyway).
 */
export async function updateStudent(id: number, changes: StudentChanges): Promise<StudentMutationResult> {
  const body: StudentChanges = {};
  for (const key of FIELDS) {
    const value = changes[key];
    if (typeof value === "string") body[key] = value;
  }
  if (!isValidId(id) || Object.keys(body).length === 0) {
    return { ok: false, notFound: false, conflict: false, message: "Nothing to save." };
  }

  const res = await adminFetch(`/admin/students/${id}`, { method: "PATCH", body: JSON.stringify(body) });

  if (res.ok) {
    refreshAdminViews();
    return { ok: true };
  }
  if (res.status === 404) {
    refreshAdminViews();
    return { ok: false, notFound: true, conflict: false, message: NOT_FOUND };
  }
  // 409 → email; 422 → the field named in `loc` or the message text.
  const field = fieldFromError(res.status, res.detail, res.message, FIELDS, "email");
  return { ok: false, notFound: false, conflict: res.status === 409, field, message: res.message };
}

/** DELETE /admin/students/{id}: 204, or 409 while the student still has enrollments. */
export async function deleteStudent(id: number): Promise<StudentMutationResult> {
  if (!isValidId(id)) {
    return { ok: false, notFound: false, conflict: false, message: "Invalid request." };
  }

  const res = await adminFetch(`/admin/students/${id}`, { method: "DELETE" });

  if (res.ok) {
    refreshAdminViews();
    return { ok: true };
  }
  if (res.status === 404) {
    refreshAdminViews();
    return { ok: false, notFound: true, conflict: false, message: NOT_FOUND };
  }
  if (res.status === 409) refreshAdminViews(); // the counts on screen were stale
  return { ok: false, notFound: false, conflict: res.status === 409, message: res.message };
}
