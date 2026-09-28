import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_HOME,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGOUT_PATH,
  ADMIN_TOKEN_COOKIE,
  isTokenObviouslyInvalid,
} from "@/lib/admin-auth";

/**
 * Fast first check for /admin only (see `matcher`) — public routes never run
 * this. It only looks at whether the cookie exists and isn't obviously
 * expired; the backend's 401 (handled by lib/admin-api.ts) is the real check.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === ADMIN_LOGOUT_PATH) return NextResponse.next();

  const isLogin = pathname === ADMIN_LOGIN_PATH;
  const token = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  if (token && isTokenObviouslyInvalid(token)) {
    const url = new URL(ADMIN_LOGIN_PATH, request.url);
    url.searchParams.set("reason", "expired");
    if (!isLogin) url.searchParams.set("next", pathname + search);
    const response = NextResponse.redirect(url);
    response.cookies.delete(ADMIN_TOKEN_COOKIE);
    return response;
  }

  if (!token && !isLogin) {
    const url = new URL(ADMIN_LOGIN_PATH, request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
