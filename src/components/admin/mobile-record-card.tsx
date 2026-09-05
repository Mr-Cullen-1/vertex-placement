import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileRecordCardProps {
  href: string;
  /** Primary identity — the strongest visual element (a candidate's
   * name, a test's title, …). */
  title: React.ReactNode;
  /** Quieter secondary line directly under the title. */
  subtitle?: React.ReactNode;
  /** Operational chips/badges (status, score, …) — wraps freely. */
  meta?: React.ReactNode;
  /** Right-aligned content before the chevron (a single leading badge). */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Shared stacked-record surface for the narrow-viewport rendering of
 * Tests/Candidates/Assignments — a real card (identity, then quiet
 * secondary info, then scannable operational chips) rather than a
 * horizontally-squeezed table row. One primitive so the three lists
 * share the same "record" language instead of three hand-rolled mobile
 * layouts. See /docs/DESIGN_SYSTEM.md "Data-list / table system".
 */
export function MobileRecordCard({ href, title, subtitle, meta, trailing, className }: MobileRecordCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10 transition-all duration-150 hover:shadow-md hover:ring-primary/25",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
        {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">{meta}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        <ChevronRightIcon className="size-4 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}
