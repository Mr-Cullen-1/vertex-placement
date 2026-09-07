import { redirect } from "next/navigation";
import { ShieldIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { getActorOrThrow } from "@/lib/actor";
import { listAdmins } from "@/server/services/user.service";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminAccountsPanel } from "@/components/admin/profile/admin-accounts-panel";

/** The sidebar account block's destination — "My account" for every
 * admin, plus "Admin accounts" management for Super Admin only (see
 * /server/services/user.service.ts). Uses the approved Testora teal
 * design system's existing Card/Badge/PageHeader primitives — no new
 * shell/layout, per the explicit "do not redesign the global Admin
 * shell" instruction. */
export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const actor = await getActorOrThrow();
  const isSuperAdmin = actor.role === "SUPER_ADMIN";
  const admins = isSuperAdmin ? await listAdmins(actor) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <PageHeader eyebrow="Account" title="Profile" description="Your account, and admin management." />

      <div className="flex flex-col gap-2">
        <h2 className="text-section-title text-foreground">My account</h2>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">{session.user.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{session.user.email}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Role</span>
              <Badge variant={isSuperAdmin ? "outline" : "secondary"} className="w-fit">
                {isSuperAdmin && <ShieldIcon className="size-3" />}
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {admins && <AdminAccountsPanel admins={admins} />}
    </div>
  );
}
