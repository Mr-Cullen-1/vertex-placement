import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

/** Authenticated admin shell (sidebar/topbar/user area) — wraps every
 * `/admin/*` route except `/admin/login`, which lives outside this route
 * group precisely so it never gets this chrome. `src/proxy.ts` already
 * redirects unauthenticated requests away from here; the check below is
 * defense in depth for direct Server Component rendering, not the
 * primary gate. */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
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
