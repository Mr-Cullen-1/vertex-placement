"use client";

import { SendIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalQuestions: number;
  /** Count of questions client-side-flagged "mark for review" — purely
   * informational here, never sent to the server. */
  markedForReviewCount?: number;
  /** Live remaining seconds, mirrored from the top bar's own timer via
   * `PlacementTimer`'s `onTick` — display only, doesn't affect timing. */
  remainingSeconds?: number | null;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  /** Jumps to the first unanswered question and closes this dialog —
   * only rendered when at least one question is unanswered. Reuses the
   * same direct-navigation the question navigator already provides;
   * this is not a new review/flagging feature. */
  onReviewUnanswered: () => void;
}

export function SubmitConfirmation({
  open,
  onOpenChange,
  answeredCount,
  totalQuestions,
  markedForReviewCount,
  remainingSeconds,
  submitting,
  error,
  onConfirm,
  onReviewUnanswered,
}: SubmitConfirmationProps) {
  const unanswered = totalQuestions - answeredCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="items-center text-center sm:items-start sm:text-left">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <SendIcon className="size-4.5" />
          </span>
          <DialogTitle>Submit your test?</DialogTitle>
          <DialogDescription>Once submitted, you cannot make further changes.</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 px-4 py-3 text-center">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Answered</dt>
            <dd className="text-lg font-semibold text-foreground tabular-nums">{answeredCount}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Unanswered</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums",
                unanswered > 0 ? "text-warning-foreground" : "text-foreground"
              )}
            >
              {unanswered}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="text-lg font-semibold text-foreground tabular-nums">{totalQuestions}</dd>
          </div>
        </dl>

        {(Boolean(markedForReviewCount) || remainingSeconds != null) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {Boolean(markedForReviewCount) && (
              <span>
                {markedForReviewCount} marked for review
              </span>
            )}
            {remainingSeconds != null && (
              <span className="tabular-nums">
                {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, "0")} remaining
              </span>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error} Please try again.
          </p>
        )}

        <DialogFooter className="sm:flex-col sm:items-stretch">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Continue test
            </Button>
            <Button onClick={onConfirm} disabled={submitting}>
              {submitting ? "Submitting…" : error ? "Try again" : unanswered > 0 ? "Submit anyway" : "Submit test"}
            </Button>
          </div>
          {unanswered > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto sm:self-end"
              onClick={onReviewUnanswered}
              disabled={submitting}
            >
              Review unanswered
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
