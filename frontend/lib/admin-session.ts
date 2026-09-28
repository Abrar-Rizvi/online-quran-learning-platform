import "server-only";

import { cookies } from "next/headers";
import { ADMIN_SESSION_MAX_AGE_SECONDS, ADMIN_TOKEN_COOKIE } from "./admin-auth";

/**
 * The admin JWT lives only in an httpOnly cookie: browser JS can't read it,
 * and it is never passed to Client Components, props, logs or URLs.
 * Setting/clearing only works in a Server Action or Route Handler.
 */

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_TOKEN_COOKIE)?.value ?? null;
}

export async function setAdminToken(token: string): Promise<void> {
  (await cookies()).set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Local `next dev` runs on plain http; everything built for production requires https.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminToken(): Promise<void> {
  (await cookies()).delete(ADMIN_TOKEN_COOKIE);
}
