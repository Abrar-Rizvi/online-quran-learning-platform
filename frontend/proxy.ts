import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_HOME,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGOUT_PATH,
  ADMIN_TOKEN_COOKIE,
  isTokenObviouslyInvalid,
} from "@/lib/admin-auth";
import { getPublicRedirect } from "@/lib/public-redirects";

/**
 * The admin guard only checks whether the cookie exists and isn't obviously
 * expired; the backend's 401 (handled by lib/admin-api.ts) is the real check.
 */
function guardAdmin(request: NextRequest) {
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`)) {
    return guardAdmin(request);
  }

  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const target = await getPublicRedirect(pathname);
  if (!target) return NextResponse.next();

  const destination = new URL(request.url);
  destination.pathname = target;
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!admin|api|_next|images(?:/|$)|opengraph-image(?:/|$)|.*\\.[^/]+$).*)",
  ],
};
