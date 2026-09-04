"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuestionNavItem {
  order: number;
  answered: boolean;
}

interface QuestionNavigatorProps {
  items: QuestionNavItem[];
  currentOrder: number;
  onJump: (order: number) => void;
  className?: string;
}

// Below this count the full grid is small enough to always show inline
// (e.g. a short dev/demo test). At or above it — the real 70-question
// test — it collapses behind a toggle on narrow screens so it never
// dominates the viewport, per /docs/DESIGN_SYSTEM.md "Question
// navigator" (a compact panel rather than filling the screen with
// buttons on mobile).
const ALWAYS_EXPANDED_THRESHOLD = 12;

/** Grid of every question number, distinguishing answered / unanswered /
 * current — never blocks jumping to an unanswered question (see
 * /docs/PRODUCT_RULES.md: skipping and returning is always allowed). */
export function QuestionNavigator({ items, currentOrder, onJump, className }: QuestionNavigatorProps) {
  const collapsible = items.length > ALWAYS_EXPANDED_THRESHOLD;
  const [expanded, setExpanded] = useState(!collapsible);
  const answeredCount = items.filter((i) => i.answered).length;

  return (
    <nav aria-label="Question navigator" className={className}>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors sm:hidden"
        >
          <span>
            Question navigator{" "}
            <span className="font-normal text-muted-foreground">
              ({answeredCount}/{items.length} answered)
            </span>
          </span>
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform duration-150", expanded && "rotate-180")} />
        </button>
      )}
      <div
        className={cn(
          "grid grid-cols-7 gap-2 sm:grid-cols-10",
          collapsible && !expanded ? "hidden sm:grid" : "mt-3 grid sm:mt-0"
        )}
      >
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
                "flex size-9 items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-all duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                !isCurrent && item.answered && "border-primary/30 bg-accent text-foreground",
                !isCurrent && !item.answered && "border-border bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {item.order}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
