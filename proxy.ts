import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

/**
 * UX-only guard: gives an unauthenticated visitor a fast redirect to the
 * login page before the shell renders. This is NOT a security boundary —
 * every admin page/action/route still passes through `requireOwner()`.
 * Cookies are only ever checked for presence here; expiry is enforced
 * server-side by better-auth.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/admin/api/")) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};