import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/12 text-info",
} as const;

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  /** A real, already-derived qualifier — e.g. "3 of 12 total" — never a
   * fabricated delta/trend (see /docs/PRODUCT_RULES.md "Do not use fake
   * content"). Omit when no such real context exists. */
  hint?: string;
  /** Purely a differentiation cue between tiles on the same dashboard —
   * still a semantic color (see /docs/DESIGN_SYSTEM.md), never decorative
   * variety for its own sake. */
  tone?: keyof typeof TONE_CLASSES;
  href?: string;
  className?: string;
}

/**
 * One metric tile anatomy shared by every dashboard stat — real counts
 * only, never a fabricated delta/percentage. Rendered as a plain `div`;
 * when `href` is given, the caller wraps it in a `Link` and passes
 * `variant="interactive"` semantics via `data-slot` styling handled by
 * the Card primitive itself.
 */
export function MetricCard({ label, value, icon: Icon, hint, tone = "primary", className }: MetricCardProps) {
  return (
    <Card size="sm" className={cn("relative overflow-hidden", className)}>
      <CardContent className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES[tone])}>
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
          {hint && <span className="mt-1 truncate text-[11px] text-muted-foreground/80">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
