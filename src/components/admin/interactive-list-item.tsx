import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveListItemProps {
  href: string;
  /** Primary identity — the strongest visual element (a candidate's
   * name, a test's title, …). Plain text, never a link — see
   * "Button-only navigation" below. */
  title: React.ReactNode;
  /** Quieter secondary line directly under the title. */
  subtitle?: React.ReactNode;
  /** Operational chips/metadata (duration, question count, score, date, …). */
  meta?: React.ReactNode;
  /** A status badge or similar, shown alongside the action. */
  status?: React.ReactNode;
  /** The explicit, always-visible action label — e.g. "Open test",
   * "View candidate", "View result". */
  actionLabel: string;
  className?: string;
}

/**
 * The one shared "interactive list" row used by Tests/Candidates/
 * Assignments (replacing a plain desktop table) and by sub-lists on
 * detail pages (attempt history, assignments-per-candidate).
 *
 * Button-only navigation (Correction pass, explicit product decision):
 * the row itself is a plain `<div>`, never a `<Link>` — the card
 * background, the title, and the metadata are NOT clickable. Only the
 * trailing action control (an explicit, always-visible "Open test" /
 * "View candidate" / "View result" button) navigates. No hidden overlay
 * link, no title-as-anchor. See /docs/DESIGN_SYSTEM.md "Button-only
 * navigation".
 */
export function InteractiveListItem({
  href,
  title,
  subtitle,
  meta,
  status,
  actionLabel,
  className,
}: InteractiveListItemProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {status}
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
        >
          {actionLabel}
          <ArrowRightIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

/** A scrollable list panel — the header/filters above it stay fixed,
 * only this region scrolls, so a long list never grows the whole
 * document (see /docs/DESIGN_SYSTEM.md "Scroll architecture"). */
export function ListPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5", className)}>{children}</div>
  );
}
