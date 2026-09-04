import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

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
    <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {backHref && (
          <Link
            href={backHref}
            className="group inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            {backLabel ?? "Back"}
          </Link>
        )}
        {eyebrow && (
          <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
