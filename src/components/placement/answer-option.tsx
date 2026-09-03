"use client";

import { cn } from "@/lib/utils";

interface AnswerOptionProps {
  label: string; // "A", "B", "C", "D"...
  text: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** Large, fully-clickable answer card — never a small radio button with a
 * label beside it (see /docs/DESIGN_SYSTEM.md "Cards"). Built as a real
 * `role="radio"` inside the question's `role="radiogroup"`
 * (PlacementQuestion) so screen readers announce "radio button, N of M,
 * selected/not selected" rather than a generic clickable div. */
export function AnswerOption({ label, text, selected, disabled, onSelect }: AnswerOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl border-2 bg-card px-5 py-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-60",
        selected
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground group-hover:border-primary/40"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-base leading-snug text-foreground",
          selected && "font-medium"
        )}
      >
        {text}
      </span>
    </button>
  );
}
