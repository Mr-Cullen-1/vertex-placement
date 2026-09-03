import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

/** Consistent title/description/action row used at the top of every
 * admin page — kept as one shared component purely to avoid repeating
 * the same header markup seven times, not a general-purpose framework. */
export function PageHeader({ title, description, backHref, backLabel, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" />
            {backLabel ?? "Back"}
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
