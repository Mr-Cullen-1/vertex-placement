"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, CircleCheckIcon, FlagIcon, SendIcon } from "lucide-react";
import {
  getAttemptQuestionsAction,
  getPlacementStatusAction,
  submitAnswerAction,
  submitAttemptAction,
} from "@/server/actions/attempt-actions";
import type { StudentResultSummary } from "@/domain/results/types";
import { Button } from "@/components/ui/button";
import { PlacementTimer } from "./placement-timer";
import { PlacementQuestion, type PlacementQuestionData } from "./placement-question";
import { QuestionNavigator } from "./question-navigator";
import { QuestionDrawer } from "./question-drawer";
import { SubmitConfirmation } from "./submit-confirmation";
import { AssessmentShell } from "./assessment-shell";
import { PlacementShellSkeleton } from "./placement-shell-skeleton";

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
 * The active assessment workspace — a dedicated exam-app frame
 * (`AssessmentShell`) with a persistent left question navigator above
 * `min-[1200px]`, collapsing to a top-bar drawer trigger below that. One
 * shared runner regardless of how the attempt was created (admin-assigned
 * or public "Try Yourself" — nothing here reads or cares about attempt
 * origin). Owns the question list and per-question save state; every
 * mutation goes through the token-authorized Server Actions
 * (src/server/actions/attempt-actions.ts) — never a direct database call
 * from this component (see /docs/PHASE_2A.md "Answer persistence").
 * Direct question navigation, autosave-on-select, the timer's normal/
 * warning/critical states, and the always-available Submit action all
 * predate the Student Assessment redesign and are unchanged — only the
 * shell layout, sidebar collapse, the client-side-only "mark for review"
 * affordance, and question-transition motion are new. "Mark for review"
 * is intentionally never sent to the server: it doesn't exist as an
 * attempt attribute today, and adding one would be a business-logic
 * change, not a UI change — see /docs/DESIGN_SYSTEM.md "Test Runner".
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
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [savedQuestionId, setSavedQuestionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ questionId: string; message: string } | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => new Set());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const finalizingRef = useRef(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTick = useCallback((seconds: number) => setRemainingSeconds(seconds), []);

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

  const goToIndex = useCallback((targetIndex: number) => {
    setCurrentIndex((prev) => {
      if (targetIndex === prev) return prev;
      setDirection(targetIndex > prev ? "next" : "prev");
      return targetIndex;
    });
  }, []);

  const jumpTo = useCallback(
    (order: number) => {
      const index = questions?.findIndex((q) => q.order === order) ?? -1;
      if (index !== -1) goToIndex(index);
    },
    [questions, goToIndex]
  );

  const toggleMarkForReview = useCallback(() => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.questionId;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, [currentQuestion]);

  const reviewUnanswered = useCallback(() => {
    const firstUnanswered = questions?.find((q) => q.selectedOptionId === null);
    setSubmitDialogOpen(false);
    if (firstUnanswered) jumpTo(firstUnanswered.order);
  }, [questions, jumpTo]);

  if (!questions || !currentQuestion) {
    return <PlacementShellSkeleton />;
  }

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const navItems = questions.map((q) => ({
    order: q.order,
    answered: q.selectedOptionId !== null,
    markedForReview: markedForReview.has(q.questionId),
  }));
  const isCurrentMarked = markedForReview.has(currentQuestion.questionId);

  return (
    <AssessmentShell
      testTitle={testTitle}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebarCollapsed={() => setSidebarCollapsed((c) => !c)}
      sidebarBody={
        <>
          <div className="flex flex-col gap-1.5 pb-4">
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
          <QuestionNavigator
            items={navItems}
            currentOrder={currentQuestion.order}
            onJump={jumpTo}
            gridClassName="grid-cols-6"
          />
        </>
      }
      topBarStart={
        <button
          type="button"
          onClick={() => setNavigatorOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted min-[1200px]:hidden"
        >
          Questions
          <span className="text-xs text-muted-foreground">
            {answeredCount}/{questions.length}
          </span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </button>
      }
      topBarCenter={
        <span className="text-sm font-semibold text-foreground tabular-nums">
          Question {currentIndex + 1} <span className="font-normal text-muted-foreground">of {questions.length}</span>
        </span>
      }
      topBarEnd={
        <>
          <PlacementTimer expiresAt={expiresAt} onExpire={handleExpire} onTick={handleTick} />
          <Button size="sm" variant="outline" onClick={() => setSubmitDialogOpen(true)} disabled={submitting}>
            <SendIcon />
            <span className="hidden sm:inline">Submit test</span>
          </Button>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMarkForReview}
            aria-pressed={isCurrentMarked}
            className={isCurrentMarked ? "border-warning/50 bg-warning/10 text-warning-foreground" : undefined}
          >
            <FlagIcon className={isCurrentMarked ? "fill-current" : undefined} />
            <span className="hidden sm:inline">{isCurrentMarked ? "Marked for review" : "Mark for review"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => goToIndex(Math.max(0, currentIndex - 1))}
              disabled={isFirst || submitting}
            >
              Previous
            </Button>
            {isLast ? (
              <Button onClick={() => setSubmitDialogOpen(true)} disabled={submitting}>
                Submit test
              </Button>
            ) : (
              <Button onClick={() => goToIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={submitting}>
                Next question
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-[880px] flex-col px-4 py-6 sm:px-6 sm:py-8">
        <PlacementQuestion
          key={currentQuestion.questionId}
          question={currentQuestion}
          totalQuestions={totalQuestions}
          disabled={submitting}
          direction={direction}
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
        markedForReviewCount={markedForReview.size}
        remainingSeconds={remainingSeconds}
        submitting={submitting}
        error={submitError}
        onConfirm={() => void runSubmit()}
        onReviewUnanswered={reviewUnanswered}
      />
    </AssessmentShell>
  );
}
