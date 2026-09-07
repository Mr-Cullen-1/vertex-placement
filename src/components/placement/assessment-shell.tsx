"use client";

import { MenuIcon, PanelLeftCloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VertexMark } from "./vertex-mark";

interface AssessmentShellProps {
  testTitle: string;
  sidebarCollapsed: boolean;
  onToggleSidebarCollapsed: () => void;
  /** Sidebar content below the brand row — test summary stats for the
   * ready/instructions screens, or the full question navigator once a
   * test is active. Scrolls independently of the rest of the shell. */
  sidebarBody: React.ReactNode;
  /** Left slot of the fixed top bar — e.g. the mobile "Questions" drawer
   * trigger. Not shown on `min-[1200px]` where the persistent sidebar
   * (and its own collapse control) takes over that role. */
  topBarStart?: React.ReactNode;
  /** Center slot — the current question position ("Question 24 of 70"),
   * omitted entirely on the ready/instructions screens. */
  topBarCenter?: React.ReactNode;
  /** Right slot — timer + submit action. */
  topBarEnd?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The dedicated Student Assessment application frame — a bordered white
 * "exam app" surface set inside the app canvas with real margin on
 * tablet/desktop, expanding to fill the screen edge-to-edge below `sm`
 * (see /docs/DESIGN_SYSTEM.md "Student Assessment shell"). One shared
 * shell for every phase of the flow (ready, instructions, the live test,
 * candidate-form intentionally excluded — see design doc) so the frame,
 * sidebar, and top bar never visually reset between phases.
 *
 * The persistent left sidebar only renders at `min-[1200px]` — below
 * that, callers are expected to provide their own drawer (the live test
 * uses `QuestionDrawer`; the ready/instructions screens have nothing to
 * drawer-ize since there's no navigator yet) via `topBarStart`. This
 * breakpoint (not the more common `lg`/1024) is deliberate: at 1024 a
 * 288px sidebar leaves too little room for a readable ~760-900px
 * question column (see /docs/DESIGN_SYSTEM.md "Responsive strategy").
 */
export function AssessmentShell({
  testTitle,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
  sidebarBody,
  topBarStart,
  topBarCenter,
  topBarEnd,
  footer,
  children,
}: AssessmentShellProps) {
  return (
    <div className="flex h-dvh overflow-hidden bg-assessment-canvas p-0 sm:p-4 lg:p-6 xl:p-8 2xl:p-10">
      <div className="mx-auto flex w-full max-w-[1560px] overflow-hidden border-card-border bg-card sm:rounded-2xl sm:border sm:shadow-xs">
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-[250ms] ease-out min-[1200px]:flex",
            sidebarCollapsed ? "w-0 border-r-0" : "w-72"
          )}
        >
          {/* Fixed-width inner wrapper so content clips cleanly during the
           * collapse transition instead of reflowing/squishing. */}
          <div className="flex h-full w-72 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border p-5">
              <VertexMark className="size-7" />
              <span className="truncate text-sm font-semibold text-foreground">{testTitle}</span>
            </div>
            <button
              type="button"
              onClick={onToggleSidebarCollapsed}
              className="mx-4 mt-3 flex w-fit shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftCloseIcon className="size-3.5" />
              Hide navigation
            </button>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pt-3">{sidebarBody}</div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {sidebarCollapsed && (
                <button
                  type="button"
                  onClick={onToggleSidebarCollapsed}
                  aria-label="Show navigation"
                  className="hidden shrink-0 items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-[1200px]:flex"
                >
                  <MenuIcon className="size-4" />
                </button>
              )}
              {topBarStart}
            </div>
            {topBarCenter && (
              // Hidden below ~420px — at that width it collides with the
              // start/end slots (drawer trigger + timer/submit) rather
              // than truncating. Not a data-loss risk: the current
              // question's position is always separately visible in the
              // question content's own overline label, unconditionally,
              // at every width — this is a chrome-only convenience
              // duplicate. See /docs/DESIGN_SYSTEM.md "Test Runner".
              <div className="hidden shrink-0 items-center justify-center min-[420px]:flex">{topBarCenter}</div>
            )}
            <div className="flex flex-1 items-center justify-end gap-2">{topBarEnd}</div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>

          {footer && <footer className="shrink-0 border-t border-border bg-card">{footer}</footer>}
        </div>
      </div>
    </div>
  );
}
