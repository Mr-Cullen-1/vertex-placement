"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionNavItem {
  order: number;
  answered: boolean;
}

interface QuestionNavigatorProps {
  items: QuestionNavItem[];
  currentOrder: number;
  onJump: (order: number) => void;
  /** Overrides the grid's column classes — the sidebar (narrower, fixed
   * width) and the mobile drawer (wider, full-bleed) want different
   * column counts for the same grid. Defaults to a responsive count
   * that works reasonably in either context. */
  gridClassName?: string;
  className?: string;
}

/**
 * Pure question-state grid, shared by the desktop sidebar and the mobile
 * drawer (Phase 2I) — direct navigation to any question, answered before
 * this phase and unchanged here (see /docs/PRODUCT_RULES.md: skipping
 * and returning is always allowed). Answered state is never color-only:
 * a small check badge marks it independent of the tint, and the current
 * question gets a solid fill plus `aria-current`, not just a border
 * change — see /docs/DESIGN_SYSTEM.md "Test Runner".
 */
export function QuestionNavigator({
  items,
  currentOrder,
  onJump,
  gridClassName,
  className,
}: QuestionNavigatorProps) {
  return (
    <nav aria-label="Question navigator" className={className}>
      <div className={cn("grid grid-cols-6 gap-2", gridClassName)}>
        {items.map((item) => {
          const isCurrent = item.order === currentOrder;
          return (
            <button
              key={item.order}
              type="button"
              onClick={() => onJump(item.order)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Question ${item.order}${item.answered ? ", answered" : ", not answered"}${isCurrent ? ", current" : ""}`}
              className={cn(
                // `aspect-square w-full` (not a fixed `size-9`) so each
                // button always exactly fills its grid track, whatever
                // that computes to — never wider than the column, so it
                // can never force the grid (or its scroll container)
                // wider than the viewport. See /docs/DESIGN_SYSTEM.md
                // "No horizontal scrolling".
                "relative flex aspect-square w-full items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                !isCurrent && item.answered && "border-primary/30 bg-accent text-foreground",
                !isCurrent && !item.answered && "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {item.order}
              {!isCurrent && item.answered && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
                >
                  <CheckIcon className="size-2" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <LegendDot className="bg-primary" label="Current" />
        <LegendDot className="border border-primary/30 bg-accent" label="Answered" />
        <LegendDot className="border border-border bg-background" label="Unanswered" />
      </div>
    </nav>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} aria-hidden="true" />
      {label}
    </span>
  );
}
