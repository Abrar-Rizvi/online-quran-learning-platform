/**
 * Admin role constants + a label helper shared by server and client code.
 * Nothing sensitive lives here — the role is just a display hint; the backend
 * enforces permissions on every request.
 */

export const OWNER_ROLE = "owner";
export const SEO_EDITOR_ROLE = "seo_editor";

/** Human label for a role, e.g. "seo_editor" → "SEO editor". */
export function roleLabel(role: string | null | undefined): string {
  if (role === SEO_EDITOR_ROLE) return "SEO editor";
  if (role === OWNER_ROLE) return "Owner";
  return role ?? "Admin";
}
