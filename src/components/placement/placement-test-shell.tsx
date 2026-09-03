"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAttemptQuestionsAction,
  getPlacementStatusAction,
  submitAnswerAction,
  submitAttemptAction,
} from "@/server/actions/attempt-actions";
import type { StudentResultSummary } from "@/domain/results/types";
import { Button } from "@/components/ui/button";
import { VertexWordmark } from "./vertex-mark";
import { PlacementTimer } from "./placement-timer";
import { PlacementQuestion, type PlacementQuestionData } from "./placement-question";
import { QuestionNavigator } from "./question-navigator";
import { SubmitConfirmation } from "./submit-confirmation";
import { PlacementLoading } from "./placement-loading";

// Codes where the invitation/attempt itself is no longer valid — retrying
// the same submit request cannot succeed, so these escalate to a
// full-page error state instead of staying in the confirmation dialog.
const NOT_RETRYABLE_CODES = new Set([
  "INVITATION_NOT_FOUND",
  "INVITATION_REVOKED",
  "ATTEMPT_NOT_FOUND",
]);

interface PlacementTestShellProps {
  token: string;
  expiresAt: string;
  totalQuestions: number;
  onCompleted: (result: StudentResultSummary) => void;
  onFatalError: (code: string, message: string) => void;
}

/** The active test-taking experience: timer, navigator, current question,
 * next/previous, and submit. Owns the question list and per-question
 * save state; every mutation goes through the token-authorized Server
 * Actions (src/server/actions/attempt-actions.ts) — never a direct
 * database call from this component (see /docs/PHASE_2A.md
 * "Answer persistence"). */
export function PlacementTestShell({
  token,
  expiresAt,
  totalQuestions,
  onCompleted,
  onFatalError,
}: PlacementTestShellProps) {
  const [questions, setQuestions] = useState<PlacementQuestionData[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ questionId: string; message: string } | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const finalizingRef = useRef(false);

  const handleAlreadyFinalized = useCallback(
    async (code: string, message: string) => {
      if (finalizingRef.current) return;
      finalizingRef.current = true;
      // The attempt was just auto-finalized server-side (expired) or is
      // otherwise already done — recover the result rather than dead-ending.
      const status = await getPlacementStatusAction(token);
      if (status.ok && status.data.kind === "COMPLETED") {
        onCompleted(status.data.result);
      } else {
        onFatalError(code, message);
      }
    },
    [token, onCompleted, onFatalError]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getAttemptQuestionsAction(token);
      if (cancelled) return;
      if (result.ok) {
        setQuestions(result.data);
        return;
      }
      await handleAlreadyFinalized(result.code, result.message);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, handleAlreadyFinalized]);

  const currentQuestion = questions?.[currentIndex] ?? null;
  const answeredCount = useMemo(
    () => questions?.filter((q) => q.selectedOptionId !== null).length ?? 0,
    [questions]
  );

  const handleSelectOption = useCallback(
    async (optionId: string) => {
      if (!currentQuestion || submitting) return;
      const questionId = currentQuestion.questionId;
      const previous = currentQuestion.selectedOptionId;

      setQuestions((prev) =>
        prev?.map((q) => (q.questionId === questionId ? { ...q, selectedOptionId: optionId } : q)) ??
        prev
      );
      setSaveError(null);
      setSavingQuestionId(questionId);

      const result = await submitAnswerAction(token, questionId, optionId);

      setSavingQuestionId((current) => (current === questionId ? null : current));

      if (!result.ok) {
        // Never silently claim a save that the backend rejected — revert
        // the optimistic selection and surface it.
        setQuestions((prev) =>
          prev?.map((q) => (q.questionId === questionId ? { ...q, selectedOptionId: previous } : q)) ??
          prev
        );
        if (result.code === "ATTEMPT_EXPIRED" || result.code === "INVALID_ATTEMPT_STATE") {
          await handleAlreadyFinalized(result.code, result.message);
        } else {
          setSaveError({ questionId, message: result.message });
        }
      }
    },
    [currentQuestion, submitting, token, handleAlreadyFinalized]
  );

  const runSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitAttemptAction(token);
    if (result.ok) {
      onCompleted(result.data);
      return;
    }
    if (result.code === "DUPLICATE_SUBMISSION" || result.code === "INVITATION_USED") {
      await handleAlreadyFinalized(result.code, result.message);
      return;
    }
    setSubmitting(false);
    if (NOT_RETRYABLE_CODES.has(result.code)) {
      setSubmitDialogOpen(false);
      onFatalError(result.code, result.message);
    } else {
      // Likely transient (network blip, momentary server error) — keep
      // the dialog open so the student can retry without losing their
      // place in the test.
      setSubmitError(result.message);
    }
  }, [token, onCompleted, onFatalError, handleAlreadyFinalized]);

  const handleExpire = useCallback(() => {
    // Client-initiated for UX only — the backend independently enforces
    // expiration on every request regardless of this call ever arriving.
    void runSubmit();
  }, [runSubmit]);

  if (!questions || !currentQuestion) {
    return <PlacementLoading label="Loading your test…" />;
  }

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <VertexWordmark />
        <PlacementTimer expiresAt={expiresAt} onExpire={handleExpire} />
      </header>

      <div className="mb-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1">
        <PlacementQuestion
          key={currentQuestion.questionId}
          question={currentQuestion}
          totalQuestions={totalQuestions}
          disabled={submitting}
          onSelect={handleSelectOption}
        />

        <div aria-live="polite" className="mt-3 min-h-5 text-sm">
          {savingQuestionId === currentQuestion.questionId && (
            <span className="text-muted-foreground">Saving…</span>
          )}
          {saveError?.questionId === currentQuestion.questionId && (
            <span className="text-destructive">
              Couldn&apos;t save your answer ({saveError.message}). Please select it again.
            </span>
          )}
        </div>
      </main>

      <QuestionNavigator
        items={questions.map((q) => ({ order: q.order, answered: q.selectedOptionId !== null }))}
        currentOrder={currentQuestion.order}
        onJump={(order) => setCurrentIndex(questions.findIndex((q) => q.order === order))}
        className="my-6"
      />

      <footer className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst || submitting}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {answeredCount} of {totalQuestions} answered
        </span>
        {isLast ? (
          <Button onClick={() => setSubmitDialogOpen(true)} disabled={submitting}>
            Submit test
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={submitting}
          >
            Next
          </Button>
        )}
      </footer>

      <SubmitConfirmation
        open={submitDialogOpen}
        onOpenChange={(nextOpen) => {
          setSubmitDialogOpen(nextOpen);
          if (!nextOpen) setSubmitError(null);
        }}
        answeredCount={answeredCount}
        totalQuestions={totalQuestions}
        submitting={submitting}
        error={submitError}
        onConfirm={() => void runSubmit()}
      />
    </div>
  );
}
