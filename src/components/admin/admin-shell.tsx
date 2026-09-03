"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, MenuIcon, XIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { signOutAction } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { VertexMark } from "@/components/placement/vertex-mark";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "./nav-items";

interface AdminShellProps {
  user: { name: string; email: string; role: UserRole };
  children: React.ReactNode;
}

/** The authenticated Admin shell: a persistent dark sidebar (desktop) or
 * an off-canvas drawer (mobile), matching the Linear/Stripe-inspired
 * admin direction from /docs/DESIGN_SYSTEM.md ("Student vs. admin visual
 * distinction"). Navigation is not role-filtered — every item here is
 * reachable by both roles; Super-Admin-only *actions* are gated within
 * each page/component instead (see /docs/PHASE_2B.md "RBAC"). */
export function AdminShell({ user, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SidebarContent user={user} className="hidden md:flex" />

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <SidebarContent
            user={user}
            className="relative z-10 flex w-72"
            onNavigate={() => setMobileNavOpen(false)}
            showCloseButton
            onClose={() => setMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <VertexMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Vertex Placement
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon />
          </Button>
        </header>

        <main className="min-w-0 flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  className,
  onNavigate,
  showCloseButton,
  onClose,
}: {
  user: AdminShellProps["user"];
  className?: string;
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-64 shrink-0 flex-col justify-between bg-sidebar px-3 py-4 text-sidebar-foreground",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <VertexMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight">Vertex Placement</span>
          </div>
          {showCloseButton && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onClose}
              className="rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-0.5">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 border-t border-sidebar-border px-2 pt-4">
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">{user.email}</span>
          <span className="mt-0.5 text-xs text-sidebar-foreground/60">
            {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
          </span>
        </div>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOutIcon className="size-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
