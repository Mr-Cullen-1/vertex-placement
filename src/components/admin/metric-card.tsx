import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  className?: string;
}

/**
 * One metric tile anatomy shared by every dashboard stat — real counts
 * only, never a fabricated delta/percentage (see /docs/PRODUCT_RULES.md
 * "Do not use fake content"). Rendered as a plain `div`; when `href` is
 * given, the caller wraps it in a `Link` and passes `variant="interactive"`
 * semantics via `data-slot` styling handled by the Card primitive itself.
 */
export function MetricCard({ label, value, icon: Icon, className }: MetricCardProps) {
  return (
    <Card size="sm" className={cn("relative overflow-hidden", className)}>
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
