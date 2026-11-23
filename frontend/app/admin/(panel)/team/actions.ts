"use server";

import { revalidatePath } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { requireOwnerRole } from "@/lib/admin-data";
import { fieldFromError } from "@/lib/admin-errors";

export type TeamField = "name" | "email" | "password";
export type TeamErrors = Partial<Record<TeamField | "form", string>>;
type TeamMutationResult = { ok: true } | { ok: false; status: number; errors: TeamErrors };

const FIELDS: readonly TeamField[] = ["name", "email", "password"];
const VALIDATION_MESSAGES: Record<TeamField, string> = {
  name: "Enter a name.",
  email: "Enter a valid email address.",
  password: "Use at least 10 characters.",
};

async function mutateUser(path: string, method: "POST" | "PATCH", body: object): Promise<TeamMutationResult> {
  await requireOwnerRole();
  const result = await adminFetch(path, { method, body: JSON.stringify(body) });

  if (result.ok) {
    revalidatePath("/admin/team");
    return { ok: true };
  }

  const { status, detail, message } = result;
  const errors: TeamErrors = {};
  if (status === 409 && method === "POST") {
    errors.email = "An account with this email already exists";
  } else if (status === 422) {
    const issues = Array.isArray(detail) ? detail.map((issue) => [issue]) : [detail];
    for (const issue of issues) {
      const field = fieldFromError(status, issue, message, FIELDS);
      if (field) errors[field] = VALIDATION_MESSAGES[field];
    }
  } else if (status === 404) {
    revalidatePath("/admin/team");
    errors.form = "This account no longer exists.";
  }
  // Validation details can include submitted values. Return only fixed messages.
  if (Object.keys(errors).length === 0) errors.form = "Couldn't save the change. Please try again.";
  return { ok: false, status, errors };
}

export async function createEditor(name: string, email: string, password: string): Promise<TeamMutationResult> {
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return { ok: false, status: 400, errors: { form: "Invalid request." } };
  }
  return mutateUser("/admin/users", "POST", { name, email, password });
}

export async function updateTeamMember(
  id: number,
  ...change: ["name" | "password", string] | ["is_active", boolean]
): Promise<TeamMutationResult> {
  const [field, value] = change;
  const validChange =
    ((field === "name" || field === "password") && typeof value === "string") ||
    (field === "is_active" && typeof value === "boolean");
  if (!Number.isSafeInteger(id) || id <= 0 || !validChange) {
    return { ok: false, status: 400, errors: { form: "Invalid request." } };
  }
  return mutateUser(`/admin/users/${id}`, "PATCH", { [field]: value });
}
