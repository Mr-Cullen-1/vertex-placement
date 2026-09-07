"use client";

import { useState } from "react";
import type { ActionResult } from "@/server/actions/action-result";
import type { PlacementStatus } from "@/server/services/attempt.service";
import type { StudentResultSummary } from "@/domain/results/types";
import { startOrResumeAttemptAction } from "@/server/actions/attempt-actions";
import { PlacementStart } from "./placement-start";
import { CandidateForm } from "./candidate-form";
import { PlacementInstructions } from "./placement-instructions";
import { PlacementTestShell } from "./placement-test-shell";
import { PlacementResult } from "./placement-result";
import { PlacementErrorState } from "./placement-error-state";

interface CandidateLike {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  email: string | null;
}

type FlowState =
  | { phase: "welcome"; testTitle: string; durationSeconds: number; totalQuestions: number }
  | { phase: "candidate-form"; testTitle: string; durationSeconds: number; totalQuestions: number; candidate: CandidateLike }
  | {
      phase: "instructions";
      testTitle: string;
      durationSeconds: number;
      totalQuestions: number;
      starting: boolean;
      error: string | null;
    }
  | { phase: "test"; expiresAt: string; totalQuestions: number; testTitle: string }
  | { phase: "result"; result: StudentResultSummary }
  | { phase: "error"; code: string };

function deriveInitialState(initial: ActionResult<PlacementStatus>): FlowState {
  if (!initial.ok) return { phase: "error", code: initial.code };

  switch (initial.data.kind) {
    case "NOT_STARTED":
      // Candidate ownership: the admin only creates access — the student
      // enters their own profile data. An incomplete profile must be
      // completed BEFORE "Ready to start" is ever shown, not after (a
      // profile-incomplete candidate landing on "Ready to start" was a
      // real ordering bug — see /docs/DESIGN_SYSTEM.md "Student flow
      // order"). An already-complete candidate is never forced through
      // the form again.
      if (!initial.data.candidateProfileComplete) {
        return {
          phase: "candidate-form",
          testTitle: initial.data.testTitle,
          durationSeconds: initial.data.durationSeconds,
          totalQuestions: initial.data.totalQuestions,
          candidate: initial.data.candidate,
        };
      }
      return {
        phase: "welcome",
        testTitle: initial.data.testTitle,
        durationSeconds: initial.data.durationSeconds,
        totalQuestions: initial.data.totalQuestions,
      };
    case "IN_PROGRESS":
      return {
        phase: "test",
        expiresAt: initial.data.expiresAt,
        totalQuestions: initial.data.totalQuestions,
        testTitle: initial.data.testTitle,
      };
    case "COMPLETED":
      return { phase: "result", result: initial.data.result };
    case "TEST_UNAVAILABLE":
      return { phase: "error", code: "TEST_UNAVAILABLE" };
  }
}

/** Orchestrates the pre-attempt wizard, then hands off to the live test
 * shell, then the result screen. Order depends on profile completeness,
 * computed once server-side in `deriveInitialState`:
 *   incomplete profile: candidate-form -> welcome -> instructions -> test
 *   complete profile:                    welcome -> instructions -> test
 * An incomplete profile is never shown "Ready to start" before completing
 * its own details (see /docs/DESIGN_SYSTEM.md "Student flow order"); an
 * already-complete profile is never forced through the form again. A
 * page refresh during the wizard simply restarts it (no attempt/timer has
 * started yet, so nothing is lost — see /docs/PHASE_2A.md) — and since
 * `deriveInitialState` re-reads profile completeness fresh from the
 * server every time, a refresh right after completing the form correctly
 * lands on "welcome," never back on the form. A refresh once the attempt
 * exists resumes it directly via `initialStatus`. */
export function PlacementFlow({
  token,
  initialStatus,
}: {
  token: string;
  initialStatus: ActionResult<PlacementStatus>;
}) {
  const [state, setState] = useState<FlowState>(() => deriveInitialState(initialStatus));

  switch (state.phase) {
    case "welcome":
      return (
        <PlacementStart
          testTitle={state.testTitle}
          durationMinutes={Math.round(state.durationSeconds / 60)}
          totalQuestions={state.totalQuestions}
          onContinue={() => {
            // By the time "welcome" is ever shown, the profile is
            // guaranteed complete — either it already was, or the
            // candidate-form step (which runs BEFORE this phase for an
            // incomplete profile) just completed it. See
            // `deriveInitialState` above.
            const { testTitle, durationSeconds, totalQuestions } = state;
            setState({ phase: "instructions", testTitle, durationSeconds, totalQuestions, starting: false, error: null });
          }}
        />
      );

    case "candidate-form":
      return (
        <CandidateForm
          token={token}
          initial={state.candidate}
          testTitle={state.testTitle}
          durationMinutes={Math.round(state.durationSeconds / 60)}
          totalQuestions={state.totalQuestions}
          onSuccess={() =>
            setState({
              phase: "welcome",
              testTitle: state.testTitle,
              durationSeconds: state.durationSeconds,
              totalQuestions: state.totalQuestions,
            })
          }
        />
      );

    case "instructions":
      return (
        <PlacementInstructions
          testTitle={state.testTitle}
          totalQuestions={state.totalQuestions}
          durationMinutes={Math.round(state.durationSeconds / 60)}
          starting={state.starting}
          error={state.error}
          onBegin={async () => {
            setState({ ...state, starting: true, error: null });
            const result = await startOrResumeAttemptAction(token);
            if (!result.ok) {
              setState({ ...state, starting: false, error: result.message });
              return;
            }
            if (result.data.status === "COMPLETED") {
              setState({ phase: "result", result: result.data.result });
              return;
            }
            setState({
              phase: "test",
              expiresAt: result.data.expiresAt,
              totalQuestions: result.data.totalQuestions,
              testTitle: state.testTitle,
            });
          }}
        />
      );

    case "test":
      return (
        <PlacementTestShell
          token={token}
          expiresAt={state.expiresAt}
          totalQuestions={state.totalQuestions}
          testTitle={state.testTitle}
          onCompleted={(result) => setState({ phase: "result", result })}
          onFatalError={(code) => setState({ phase: "error", code })}
        />
      );

    case "result":
      return <PlacementResult result={state.result} />;

    case "error":
      return <PlacementErrorState code={state.code} />;
  }
}
