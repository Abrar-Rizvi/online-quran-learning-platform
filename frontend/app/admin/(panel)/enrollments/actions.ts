"use server";

import { revalidatePath } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { isEnrollmentStatus } from "@/lib/enrollment";

export type MutationResult =
  | { ok: true }
  | { ok: false; notFound: boolean; message: string };

const NOT_FOUND = "This enrollment no longer exists.";

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** Both pages show enrollment data; refresh them after any change (or a 404 that reveals one). */
function refreshAdminViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/enrollments");
}

/**
 * PATCH /admin/enrollments/{id}/status. Auth is enforced by adminFetch (no
 * cookie → login; backend 401 → logout route). The backend decides whether the
 * transition is allowed; its 400 message is returned as-is.
 */
export async function updateEnrollmentStatus(id: number, status: string): Promise<MutationResult> {
  if (!isValidId(id) || !isEnrollmentStatus(status)) {
    return { ok: false, notFound: false, message: "Invalid request." };
  }

  const res = await adminFetch(`/admin/enrollments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  if (res.ok) {
    refreshAdminViews();
    return { ok: true };
  }
  if (res.status === 404) {
    refreshAdminViews();
    return { ok: false, notFound: true, message: NOT_FOUND };
  }
  return { ok: false, notFound: false, message: res.message };
}

/** DELETE /admin/enrollments/{id} (hard delete, 204). */
export async function deleteEnrollment(id: number): Promise<MutationResult> {
  if (!isValidId(id)) {
    return { ok: false, notFound: false, message: "Invalid request." };
  }

  const res = await adminFetch(`/admin/enrollments/${id}`, { method: "DELETE" });

  if (res.ok) {
    refreshAdminViews();
    return { ok: true };
  }
  if (res.status === 404) {
    refreshAdminViews();
    return { ok: false, notFound: true, message: NOT_FOUND };
  }
  return { ok: false, notFound: false, message: res.message };
}
