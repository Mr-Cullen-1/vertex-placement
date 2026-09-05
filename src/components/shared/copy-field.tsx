"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyFieldProps {
  value: string;
  className?: string;
  /** Announced to screen readers when the copy succeeds. */
  label?: string;
}

/** A polished copyable value field — used for the one-time invitation
 * link, so "Create assignment -> Generate invitation -> Copy link" (the
 * product's primary workflow, see /docs/DESIGN_SYSTEM.md) has one clear
 * piece of UI rather than a bare `<code>` + button. Copy failures
 * (clipboard API unavailable) are silent since the value stays visible
 * and selectable in the field itself. */
export function CopyField({ value, className, label = "Copied to clipboard" }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the value is still visible
      // and selectable in the field itself.
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-primary/25 bg-background px-2 py-1.5",
        className
      )}
    >
      {/* Truncated with an ellipsis, not internally scrollable — the
       * Copy button already copies the full value regardless of what's
       * visible (see /docs/DESIGN_SYSTEM.md "No horizontal scrolling").
       * `title` surfaces the full value on hover as a fallback. */}
      <code
        title={value}
        className="block min-w-0 flex-1 truncate px-1.5 py-1 text-xs text-foreground"
      >
        {value}
      </code>
      <Button type="button" size="sm" variant={copied ? "secondary" : "outline"} onClick={handleCopy} className="shrink-0">
        {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? label : ""}
      </span>
    </div>
  );
}
