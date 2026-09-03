import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Gates authentication only. Role-based authorization (Admin vs Super
// Admin) is enforced per-route in layouts/route handlers — see
// /docs/ROUTES.md for the permission matrix.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
