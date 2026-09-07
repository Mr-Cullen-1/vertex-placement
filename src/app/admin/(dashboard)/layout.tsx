import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isUserSessionActive } from "@/server/services/user.service";
import { AdminShell } from "@/components/admin/admin-shell";

/** Authenticated admin shell (sidebar/topbar/user area) — wraps every
 * `/admin/*` route except `/admin/login`, which lives outside this route
 * group precisely so it never gets this chrome. `src/proxy.ts` already
 * redirects unauthenticated requests away from here; the check below is
 * defense in depth for direct Server Component rendering, not the
 * primary gate.
 *
 * Also where a deactivated/removed admin is sent back to login at the
 * SHELL level (not just left to hit a deeper data-fetch error) — this
 * layout renders once per real navigation into the admin section, never
 * once per Link prefetch, so it's a safe place for the one extra DB
 * round-trip this check costs. See src/lib/actor.ts for why the
 * equivalent check does NOT live in `proxy.ts` or the `jwt` callback. */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }
  if (!(await isUserSessionActive(session.user.id))) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      user={{
        name: session.user.name ?? session.user.email ?? "Admin",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
