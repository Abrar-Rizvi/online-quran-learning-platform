import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH, ADMIN_LOGOUT_PATH } from "./admin-auth";
import { getAdminToken } from "./admin-session";

/**
 * Server-to-server base URL for admin calls. API_URL (server-only, optional)
 * lets production reach the backend over a private address; it falls back to
 * the same NEXT_PUBLIC_API_URL the public site uses.
 */
const BASE_URL =
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AdminResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      message: string;
      /** FastAPI's raw `detail` (a string, or for 422 a list of `{ loc, msg }`), for field-level errors. */
      detail?: unknown;
    };

/** Reads FastAPI's `detail`: a readable message plus the raw value. */
async function readDetail(res: Response): Promise<{ message: string; detail?: unknown }> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return { message: body.detail, detail: body.detail };
    const first = Array.isArray(body.detail) ? (body.detail[0] as { msg?: unknown } | undefined) : undefined;
    return { message: typeof first?.msg === "string" ? first.msg : "", detail: body.detail };
  } catch {
    return { message: "" };
  }
}

/**
 * Authenticated, never-cached fetch for `/admin/*` endpoints.
 *
 * - No cookie → login page (proxy.ts normally catches this first).
 * - Backend 401 → the logout Route Handler, which clears the cookie and shows
 *   the "session expired" notice (Server Components can't modify cookies).
 *   Server Actions that handle expiry in their own response can opt out.
 * - Everything else is returned as a result, never thrown.
 */
export async function adminFetch<T>(
  path: string,
  { redirectOnUnauthorized = true, ...init }: RequestInit & { redirectOnUnauthorized?: boolean } = {},
): Promise<AdminResult<T>> {
  const token = await getAdminToken();
  if (!token) redirect(ADMIN_LOGIN_PATH);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return { ok: false, status: 0, message: "Couldn't reach the server. Please try again." };
  }

  // redirect() throws, so it must stay outside the try/catch above.
  if (res.status === 401 && redirectOnUnauthorized) redirect(`${ADMIN_LOGOUT_PATH}?reason=expired`);

  if (!res.ok) {
    const { message, detail } = await readDetail(res);
    // 403 means the token is valid but the role can't access this endpoint.
    // It is never a logout — show a calm message instead.
    if (res.status === 403) {
      return {
        ok: false,
        status: res.status,
        message: "You don't have permission to view this.",
        detail,
      };
    }
    return {
      ok: false,
      status: res.status,
      message: message || "Something went wrong. Please try again.",
      detail,
    };
  }

  if (res.status === 204) return { ok: true, data: undefined as T };
  return { ok: true, data: (await res.json()) as T };
}

export type AdminLoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid" | "not_configured" | "unavailable" }
  /** Too many failed attempts from this IP; `minutes` until the next try (from Retry-After). */
  | { ok: false; reason: "rate_limited"; minutes: number };

/** POST /auth/login, server-to-server. The token only goes into the httpOnly cookie. */
export async function requestAdminToken(
  username: string,
  password: string,
): Promise<AdminLoginResult> {
  try {
    // Forward the visitor's IP so the backend's per-IP login lockout sees it,
    // not the Next.js server's IP. Taken from the incoming request's
    // X-Forwarded-For (left unset when absent).
    const forwardedFor = (await headers()).get("x-forwarded-for");
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const body = (await res.json()) as { access_token?: unknown };
      if (typeof body.access_token === "string" && body.access_token) {
        return { ok: true, token: body.access_token };
      }
      return { ok: false, reason: "unavailable" };
    }
    if (res.status === 401) return { ok: false, reason: "invalid" };
    if (res.status === 429) {
      const seconds = Number(res.headers.get("retry-after"));
      return { ok: false, reason: "rate_limited", minutes: Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : 15 };
    }
    if (res.status === 503) return { ok: false, reason: "not_configured" };
    return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
