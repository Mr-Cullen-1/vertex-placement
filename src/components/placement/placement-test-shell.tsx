"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CircleCheckIcon, SendIcon } from "lucide-react";
import {
  getAttemptQuestionsAction,
  getPlacementStatusAction,
  submitAnswerAction,
  submitAttemptAction,
} from "@/server/actions/attempt-actions";
import type { StudentResultSummary } from "@/domain/results/types";
import { Button } from "@/components/ui/button";
import { VertexMark } from "./vertex-mark";
import { PlacementTimer } from "./placement-timer";
import { PlacementQuestion, type PlacementQuestionData } from "./placement-question";
import { QuestionNavigator } from "./question-navigator";
import { QuestionDrawer } from "./question-drawer";
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

// How long the inline "Saved" confirmation stays visible after a
// successful autosave — long enough to notice, short enough to never
// feel like a lingering toast (see /docs/DESIGN_SYSTEM.md "Test Runner").
const SAVED_FEEDBACK_MS = 1500;

interface PlacementTestShellProps {
  token: string;
  expiresAt: string;
  totalQuestions: number;
  testTitle: string;
  onCompleted: (result: StudentResultSummary) => void;
  onFatalError: (code: string, message: string) => void;
}

/**
 * The active assessment workspace (Phase 2I) — a persistent left question
 * navigator + top assessment bar + centered question workspace on
 * desktop, collapsing to a top bar with a "Questions" drawer trigger on
 * narrow viewports. One shared runner regardless of how the attempt was
 * created (admin-assigned today; a future public "Try Yourself" flow
 * would enter exactly the same component with the same props — nothing
 * here reads or cares about attempt origin). Owns the question list and
 * per-question save state; every mutation goes through the
 * token-authorized Server Actions (src/server/actions/attempt-actions.ts)
 * — never a direct database call from this component (see
 * /docs/PHASE_2A.md "Answer persistence"). Direct question navigation,
 * autosave-on-select, and the timer's normal/warning/critical states all
 * predate this phase and are unchanged — only the layout, the answered-
 * state affordance, and the always-available Submit action are new. See
 * /docs/DESIGN_SYSTEM.md "Test Runner" for the full audit and rationale.
 */
export function PlacementTestShell({
  token,
  expiresAt,
  totalQuestions,
  testTitle,
  onCompleted,
  onFatalError,
}: PlacementTestShellProps) {
  const [questions, setQuestions] = useState<PlacementQuestionData[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ questionId: string; message: string } | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const finalizingRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
  }, []);

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
      setSavedQuestionId(null);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
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
        return;
      }

      setSavedQuestionId(questionId);
      savedTimeoutRef.current = setTimeout(() => {
        setSavedQuestionId((current) => (current === questionId ? null : current));
      }, SAVED_FEEDBACK_MS);
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

  const jumpTo = useCallback(
    (order: number) => {
      setCurrentIndex((prev) => {
        const index = questions?.findIndex((q) => q.order === order) ?? -1;
        return index === -1 ? prev : index;
      });
    },
    [questions]
  );

  const reviewUnanswered = useCallback(() => {
    const firstUnanswered = questions?.find((q) => q.selectedOptionId === null);
    setSubmitDialogOpen(false);
    if (firstUnanswered) jumpTo(firstUnanswered.order);
  }, [questions, jumpTo]);

  if (!questions || !currentQuestion) {
    return <PlacementLoading label="Loading your test…" />;
  }

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const navItems = questions.map((q) => ({ order: q.order, answered: q.selectedOptionId !== null }));
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* LEFT QUESTION NAVIGATOR — persistent from `lg` up; below that, the
       * same content lives in <QuestionDrawer>. A 70-question grid gets
       * its own scroll region (`min-h-0 overflow-y-auto`) so it never
       * forces the whole page — or the timer/submit controls above it —
       * to scroll out of view. */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border p-5">
          <div className="flex items-center gap-2.5">
            <VertexMark className="size-7" />
            <span className="truncate text-sm font-semibold text-foreground">{testTitle}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </span>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <QuestionNavigator
            items={navItems}
            currentOrder={currentQuestion.order}
            onJump={jumpTo}
            gridClassName="grid-cols-6"
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* TOP ASSESSMENT BAR — time remaining, progress, and an
         * always-available submit action (submitting mid-test was never
         * actually blocked server-side; only the old UI restricted it to
         * the final question — see the audit note above). */}
        <header className="shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setNavigatorOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              Questions
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length}
              </span>
              <ChevronDownIcon className="size-3.5 text-muted-foreground" />
            </button>

            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Progress
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {answeredCount} / {questions.length}{" "}
                <span className="font-normal text-muted-foreground">
                  ({questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0}%)
                </span>
              </span>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <PlacementTimer expiresAt={expiresAt} onExpire={handleExpire} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubmitDialogOpen(true)}
                disabled={submitting}
              >
                <SendIcon />
                <span className="hidden sm:inline">Submit test</span>
              </Button>
            </div>
          </div>
          {/* Thin overall-progress bar, visible at every width — the
           * sidebar's own bar duplicates this on desktop, which is fine:
           * the top bar's copy is what narrow viewports rely on. */}
          <div className="h-1 w-full overflow-hidden bg-muted sm:hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
            />
          </div>
        </header>

        {/* MAIN QUESTION WORKSPACE */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
            <PlacementQuestion
              key={currentQuestion.questionId}
              question={currentQuestion}
              totalQuestions={totalQuestions}
              disabled={submitting}
              onSelect={handleSelectOption}
            />

            <div aria-live="polite" className="mt-4 min-h-5 text-sm">
              {savingQuestionId === currentQuestion.questionId && (
                <span className="text-muted-foreground">Saving…</span>
              )}
              {savedQuestionId === currentQuestion.questionId && (
                <span className="flex items-center gap-1.5 text-success">
                  <CircleCheckIcon className="size-4" />
                  Saved
                </span>
              )}
              {saveError?.questionId === currentQuestion.questionId && (
                <span className="text-destructive">
                  Couldn&apos;t save your answer ({saveError.message}). Please select it again.
                </span>
              )}
            </div>
          </div>
        </main>

        {/* PREVIOUS / NEXT — predictable bottom navigation; the final
         * question's right-hand button becomes the primary Submit action
         * (the top bar's Submit button, above, is the same action
         * available from anywhere, not a replacement for this). */}
        <footer className="shrink-0 border-t border-border bg-card">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst || submitting}
            >
              Previous
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Question {currentIndex + 1} of {questions.length} · {progressPercent}%
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
          </div>
        </footer>
      </div>

      <QuestionDrawer
        open={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        testTitle={testTitle}
        items={navItems}
        currentOrder={currentQuestion.order}
        onJump={jumpTo}
      />

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
        onReviewUnanswered={reviewUnanswered}
      />
    </div>
  );
}
