import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LOGIN_PATH, ADMIN_TOKEN_COOKIE } from "@/lib/admin-auth";

/**
 * Target of lib/admin-api.ts when the backend rejects the token (401).
 * Server Components can't modify cookies, so they redirect here instead.
 * Nothing links to this route, so it is never prefetched.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(`${ADMIN_LOGIN_PATH}?reason=expired`, request.url),
  );
  response.cookies.delete(ADMIN_TOKEN_COOKIE);
  return response;
}
