import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isUserSessionActive } from "@/server/services/user.service";

// Gates authentication only. Role-based authorization (Admin vs Super
// Admin) is enforced per-route in layouts/route handlers — see
// /docs/ROUTES.md for the permission matrix.
//
// Deliberately does NOT re-check `isActive` for the general (logged
// in, not on the login page) case — see src/lib/auth.ts for why a DB
// round-trip on every request here (including every Link prefetch)
// caused real navigation flakiness. The Admin layout already redirects
// a deactivated admin to `/admin/login` on their next real page render.
//
// It DOES need the check for exactly one narrow branch below: without
// it, a deactivated admin bounced here by the layout would immediately
// get bounced right back out (their JWT still decodes fine even though
// the account is inactive) — an infinite redirect loop. This branch
// only runs for requests actually targeting `/admin/login`, not the
// general navigation hot path, so the extra DB round-trip here is rare
// and safe.
export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginPage) {
    const stillActive = req.auth?.user?.id ? await isUserSessionActive(req.auth.user.id) : null;
    if (stillActive) {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
