import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

/**
 * The shared "go back" control — a small polished secondary button, not
 * a bare text link, so it reads as clearly clickable (see
 * /docs/DESIGN_SYSTEM.md "Back button system"). Used by `PageHeader` and
 * anywhere else a page needs to link back to its parent list.
 */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
    >
      <ArrowLeftIcon className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
