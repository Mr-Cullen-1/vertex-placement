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
  | { phase: "welcome"; testTitle: string; durationSeconds: number; totalQuestions: number; candidate: CandidateLike }
  | { phase: "candidate-form"; testTitle: string; durationSeconds: number; totalQuestions: number; candidate: CandidateLike }
  | {
      phase: "instructions";
      testTitle: string;
      durationSeconds: number;
      totalQuestions: number;
      starting: boolean;
      error: string | null;
    }
  | { phase: "test"; expiresAt: string; totalQuestions: number }
  | { phase: "result"; result: StudentResultSummary }
  | { phase: "error"; code: string };

function deriveInitialState(initial: ActionResult<PlacementStatus>): FlowState {
  if (!initial.ok) return { phase: "error", code: initial.code };

  switch (initial.data.kind) {
    case "NOT_STARTED":
      return {
        phase: "welcome",
        testTitle: initial.data.testTitle,
        durationSeconds: initial.data.durationSeconds,
        totalQuestions: initial.data.totalQuestions,
        candidate: initial.data.candidate,
      };
    case "IN_PROGRESS":
      return { phase: "test", expiresAt: initial.data.expiresAt, totalQuestions: initial.data.totalQuestions };
    case "COMPLETED":
      return { phase: "result", result: initial.data.result };
    case "TEST_UNAVAILABLE":
      return { phase: "error", code: "TEST_UNAVAILABLE" };
  }
}

/** Orchestrates the pre-attempt wizard (welcome -> candidate confirmation
 * -> instructions), then hands off to the live test shell, then the
 * result screen. A page refresh during the wizard simply restarts it
 * (no attempt/timer has started yet, so nothing is lost — see
 * /docs/PHASE_2A.md); a refresh once the attempt exists resumes it
 * directly via `initialStatus`, computed server-side in page.tsx. */
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
          onContinue={() => setState({ ...state, phase: "candidate-form" })}
        />
      );

    case "candidate-form":
      return (
        <CandidateForm
          token={token}
          initial={state.candidate}
          onSuccess={() =>
            setState({
              phase: "instructions",
              testTitle: state.testTitle,
              durationSeconds: state.durationSeconds,
              totalQuestions: state.totalQuestions,
              starting: false,
              error: null,
            })
          }
        />
      );

    case "instructions":
      return (
        <PlacementInstructions
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
