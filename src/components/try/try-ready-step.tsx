"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { startPublicAttemptAction, resumeActiveAttemptAction } from "@/server/actions/self-serve-actions";

const RULES = [
  "Questions become progressively more difficult as you go.",
  "Answer as many questions as you can.",
  "You may skip a question and come back to it later.",
  "You can change an answer any time before you submit.",
  "The test ends automatically when time runs out.",
];

interface TryReadyStepProps {
  mode: "start" | "resume" | "elsewhere";
  attemptNumber: 1 | 2;
  testTitle: string;
  durationMinutes?: number;
  totalQuestions?: number;
}

/** Pre-test screen — "Attempt N of 2" plus the same instructions the
 * admin-assigned flow shows (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Pre-test screen"). Starting/resuming both hand off to the exact same,
 * unmodified Test Runner at `/placement/{token}` — nothing about the
 * runner itself is aware this is a public attempt. */
export function TryReadyStep({ mode, attemptNumber, testTitle, durationMinutes, totalQuestions }: TryReadyStepProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setBusy(true);
    // A safety-net timeout, not an artificial minimum delay: if the
    // server action itself never resolves (rather than rejecting), the
    // button would otherwise stay disabled forever with no explanation.
    // The subsequent router.push into /placement/[token] is separately
    // covered by that route's own loading.tsx.
    const timeoutId = setTimeout(() => {
      setBusy(false);
      setError("This is taking longer than expected. Please check your connection and try again.");
    }, 15000);
    const result = mode === "resume" ? await resumeActiveAttemptAction() : await startPublicAttemptAction();
    clearTimeout(timeoutId);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.push(`/placement/${result.data.token}`);
  }

  return (
    <OnboardingShell step="start">
      <div className="flex w-full max-w-md animate-page-in flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Attempt {attemptNumber} of 2
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{testTitle}</h1>
        </div>

        {mode === "elsewhere" ? (
          <p className="text-sm text-muted-foreground">
            You have an assessment in progress. Please continue from the browser or device where
            you started it.
          </p>
        ) : (
          <>
            {durationMinutes != null && totalQuestions != null && (
              <dl className="grid w-full grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-5 shadow-xs">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Duration</dt>
                  <dd className="text-2xl font-semibold text-foreground tabular-nums">{durationMinutes} min</dd>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-5 shadow-xs">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Questions</dt>
                  <dd className="text-2xl font-semibold text-foreground tabular-nums">{totalQuestions}</dd>
                </div>
              </dl>
            )}

            <ul className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-xs">
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    •
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button size="lg" className="h-11 w-full text-base" onClick={handleClick} disabled={busy}>
              {busy ? "Starting…" : mode === "resume" ? "Resume assessment" : "Start assessment"}
            </Button>
          </>
        )}
      </div>
    </OnboardingShell>
  );
}
