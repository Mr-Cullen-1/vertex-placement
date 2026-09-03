"use client";

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

/** Grid of every question number, distinguishing answered / unanswered /
 * current — never blocks jumping to an unanswered question (see
 * /docs/PRODUCT_RULES.md: skipping and returning is always allowed). */
export function QuestionNavigator({ items, currentOrder, onJump, className }: QuestionNavigatorProps) {
  return (
    <nav aria-label="Question navigator" className={className}>
      <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
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
                "flex size-9 items-center justify-center rounded-lg border text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
