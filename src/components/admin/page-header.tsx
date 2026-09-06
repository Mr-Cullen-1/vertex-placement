import * as React from "react";
import { BackButton } from "./back-button";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

/** Consistent title/description/action row used at the top of every
 * admin page — kept as one shared component purely to avoid repeating
 * the same header markup seven times, not a general-purpose framework. */
export function PageHeader({ eyebrow, title, description, backHref, backLabel, action }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        {backHref && <BackButton href={backHref} label={backLabel ?? "Back"} />}
        {eyebrow && <span className="text-overline text-primary">{eyebrow}</span>}
        <h1 className="text-page-title text-foreground">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
