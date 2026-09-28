/**
 * Admin auth constants + pure helpers shared by proxy.ts, the admin Server
 * Actions and the session module. Nothing secret lives here — the token
 * itself is only ever read/written by the server-only modules.
 */

export const ADMIN_TOKEN_COOKIE = "aoa_admin_token";

/** Matches the backend's JWT lifetime (ACCESS_TOKEN_EXPIRE_HOURS = 8). */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_LOGOUT_PATH = "/admin/logout";

/**
 * Returns `value` only if it is a same-site admin path, otherwise `/admin`.
 * Rejects absolute/protocol-relative URLs ("https://…", "//…", "/\…"), paths
 * that merely start with the letters "/admin" (e.g. "/admin.evil.com"), and
 * the login/logout routes themselves (redirect loops).
 */
export function sanitizeAdminNext(value: unknown): string {
  if (typeof value !== "string") return ADMIN_HOME;
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return ADMIN_HOME;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return ADMIN_HOME;

  const path = value.split(/[?#]/)[0];
  if (path === ADMIN_LOGIN_PATH || path === ADMIN_LOGOUT_PATH) return ADMIN_HOME;
  return value;
}

/**
 * True when the JWT is malformed or its `exp` has passed. Decodes the payload
 * WITHOUT verifying the signature — only for an early redirect, never for
 * authorization (the backend's 401 is the real check).
 */
export function isTokenObviouslyInvalid(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload: unknown = JSON.parse(atob(base64));
    const exp = (payload as { exp?: unknown }).exp;
    if (typeof exp !== "number") return true;
    return exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
