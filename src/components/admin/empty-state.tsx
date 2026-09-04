import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

/** Quiet empty state with a restrained icon treatment — no stock
 * illustration, per /docs/DESIGN_SYSTEM.md ("Empty/placeholder
 * states"). Used whenever a list genuinely has no data yet, never as a
 * substitute for real content. */
export function EmptyState({ title, description, action, icon: Icon = InboxIcon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
