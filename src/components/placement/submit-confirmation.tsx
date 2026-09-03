"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SubmitConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalQuestions: number;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
}

export function SubmitConfirmation({
  open,
  onOpenChange,
  answeredCount,
  totalQuestions,
  submitting,
  error,
  onConfirm,
}: SubmitConfirmationProps) {
  const unanswered = totalQuestions - answeredCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit your test?</DialogTitle>
          <DialogDescription>
            You have answered {answeredCount} of {totalQuestions} questions.
            {unanswered > 0 &&
              ` ${unanswered} question${unanswered === 1 ? " remains" : "s remain"} unanswered.`}{" "}
            Once submitted, you cannot make further changes.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error} Please try again.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Continue test
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Submitting…" : error ? "Try again" : "Submit test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
