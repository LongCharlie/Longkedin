// ============================================================
// Next.js Middleware — Protects dashboard routes
// ============================================================
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboardRoute =
    req.nextUrl.pathname.startsWith("/jobs") ||
    req.nextUrl.pathname.startsWith("/tracker") ||
    req.nextUrl.pathname.startsWith("/resume") ||
    req.nextUrl.pathname.startsWith("/interview") ||
    req.nextUrl.pathname.startsWith("/analytics") ||
    req.nextUrl.pathname.startsWith("/settings");

  if (isDashboardRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/jobs/:path*",
    "/tracker/:path*",
    "/resume/:path*",
    "/interview/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
