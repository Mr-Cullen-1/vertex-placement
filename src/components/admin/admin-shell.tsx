"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon, MenuIcon, XIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { signOutAction } from "@/server/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const pathname = usePathname();

  // Close the drawer automatically on route change (e.g. a link inside
  // it was followed) so it never lingers open over the new page. Adjusted
  // during render (React's documented pattern for "reset state when a
  // prop changes") rather than in an effect, which would cause an extra
  // render pass — see https://react.dev/learn/you-might-not-need-an-effect.
  const [priorPathname, setPriorPathname] = useState(pathname);
  if (pathname !== priorPathname) {
    setPriorPathname(pathname);
    if (mobileNavOpen) setMobileNavOpen(false);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <SidebarContent user={user} className="hidden md:flex" />

      {/* Mobile drawer — always mounted (not conditionally rendered) so
       * both the entrance and exit get a real transition instead of an
       * instant pop; visibility is purely transform/opacity driven. */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex md:hidden",
          !mobileNavOpen && "pointer-events-none"
        )}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          tabIndex={mobileNavOpen ? 0 : -1}
          aria-label="Close navigation"
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            mobileNavOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <SidebarContent
          user={user}
          className={cn(
            "relative z-10 flex w-72 shadow-2xl transition-transform duration-200 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onNavigate={() => setMobileNavOpen(false)}
          showCloseButton
          onClose={() => setMobileNavOpen(false)}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm md:hidden">
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
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon />
          </Button>
        </header>

        {/* The scroll container. The shell itself is a fixed 100dvh with
         * `overflow-hidden` (see the root div above) so the sidebar and
         * mobile topbar stay put — only this element scrolls. `min-h-0`
         * on both this wrapper and `<main>` is required for a flex child
         * to actually shrink and hand scrolling to `overflow-y-auto`
         * instead of growing to fit all content (the classic flexbox
         * "min-height: auto" trap). `relative` lets a loading.tsx's
         * `absolute inset-0` VertexLoader overlay anchor to THIS
         * element's own fixed (flexbox-resolved) box — not to a
         * content-driven wrapper further down, which would re-center on
         * whatever height the skeleton content happens to stack to
         * (e.g. a two-column skeleton collapsing to one column below
         * `lg`) instead of the actually-visible workspace. See
         * /docs/DESIGN_SYSTEM.md "Loading system". */}
        <main
          key={pathname}
          className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto animate-page-in bg-background"
        >
          {children}
        </main>
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
  const initials =
    user.name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  return (
    <aside
      className={cn(
        "w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2.5">
            <VertexMark className="size-7" />
            <span className="text-sm font-semibold tracking-tight">Vertex Placement</span>
          </div>
          {showCloseButton && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onClose}
              className="rounded-md p-1 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 border-t border-sidebar-border px-2 pt-4">
        <Link
          href="/admin/profile"
          onClick={onNavigate}
          className="flex items-center gap-2.5 overflow-hidden rounded-lg px-1 py-1 transition-colors duration-150 hover:bg-sidebar-accent"
        >
          <Avatar size="sm" className="shrink-0 bg-sidebar-accent">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-sidebar-foreground/55">{user.email}</span>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-sidebar-primary/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sidebar-primary uppercase">
            {user.role === "SUPER_ADMIN" ? "Super" : "Admin"}
          </span>
        </Link>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-sidebar-border bg-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOutIcon className="size-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
