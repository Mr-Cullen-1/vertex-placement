import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ClipboardList, Users, Send } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact-match only (used for /admin itself, which would otherwise
   * match every nested route as a prefix). */
  exact?: boolean;
}

/** Reachable by both Admin and Super Admin — Tests is read-only for
 * Admin (enforced by `test:write` in the service layer and by hiding
 * authoring controls on the page itself), not hidden from navigation. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/tests", label: "Tests", icon: ClipboardList },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/assignments", label: "Assignments", icon: Send },
];
