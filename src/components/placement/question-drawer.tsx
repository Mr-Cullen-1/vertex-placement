"use client";

import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionNavigator, type QuestionNavItem } from "./question-navigator";

interface QuestionDrawerProps {
  open: boolean;
  onClose: () => void;
  testTitle: string;
  items: QuestionNavItem[];
  currentOrder: number;
  onJump: (order: number) => void;
}

/**
 * The mobile stand-in for the desktop sidebar navigator (Phase 2I) — below
 * `lg`, the full question grid doesn't fit persistently, so it lives
 * behind a "Questions" trigger in the top bar instead. Always mounted
 * (not conditionally rendered), matching the admin shell's own mobile
 * drawer convention (`admin-shell.tsx`), so both open and close get a
 * real transform/opacity transition instead of an instant pop.
 */
export function QuestionDrawer({ open, onClose, testTitle, items, currentOrder, onJump }: QuestionDrawerProps) {
  const answeredCount = items.filter((i) => i.answered).length;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex min-[1200px]:hidden", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close question navigator"
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 ml-auto flex h-full w-full max-w-xs flex-col bg-card shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-foreground">{testTitle}</span>
            <span className="text-xs text-muted-foreground">
              {answeredCount} of {items.length} answered
            </span>
          </div>
          <button
            type="button"
            aria-label="Close question navigator"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <QuestionNavigator
            items={items}
            currentOrder={currentOrder}
            onJump={(order) => {
              onJump(order);
              onClose();
            }}
            gridClassName="grid-cols-6"
          />
        </div>
      </div>
    </div>
  );
}
