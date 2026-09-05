"use client";

import { useState } from "react";
import type { ActionResult } from "@/server/actions/action-result";
import type { PublicFlowStatus } from "@/domain/self-serve/types";
import type { StudentResultSummary } from "@/domain/results/types";
import { getPublicFlowStatusAction } from "@/server/actions/self-serve-actions";
import { TryEmailStep } from "./try-email-step";
import { TryCodeStep } from "./try-code-step";
import { TryProfileStep } from "./try-profile-step";
import { TryReadyStep } from "./try-ready-step";
import { TryResultStep } from "./try-result-step";
import { TryUnavailableStep } from "./try-unavailable-step";

type Phase =
  | { view: "email" }
  | { view: "code"; email: string }
  | { view: "profile"; email: string }
  | { view: "ready"; attemptNumber: 1 | 2; testTitle: string; durationSeconds: number; totalQuestions: number }
  | { view: "resume"; attemptNumber: 1 | 2; testTitle: string }
  | { view: "elsewhere"; attemptNumber: 1 | 2; testTitle: string }
  | { view: "result"; result: StudentResultSummary; canRetake: boolean }
  | { view: "unavailable" }
  | { view: "error" };

function derivePhase(status: PublicFlowStatus, email: string | null): Phase {
  switch (status.kind) {
    case "EMAIL_REQUIRED":
      return { view: "email" };
    case "PROFILE_REQUIRED":
      return { view: "profile", email: email ?? "" };
    case "PUBLIC_TEST_UNAVAILABLE":
      return { view: "unavailable" };
    case "READY":
      return {
        view: "ready",
        attemptNumber: status.attemptNumber,
        testTitle: status.testTitle,
        durationSeconds: status.durationSeconds,
        totalQuestions: status.totalQuestions,
      };
    case "IN_PROGRESS":
      return { view: "resume", attemptNumber: status.attemptNumber, testTitle: status.testTitle };
    case "IN_PROGRESS_ELSEWHERE":
      return { view: "elsewhere", attemptNumber: status.attemptNumber, testTitle: status.testTitle };
    case "ATTEMPT_COMPLETE":
      return { view: "result", result: status.result, canRetake: true };
    case "LIMIT_REACHED":
      return { view: "result", result: status.result, canRetake: false };
  }
}

/**
 * Orchestrates the public self-service ("Try Yourself") wizard — email
 * -> code -> profile -> ready/resume -> (hands off to the shared,
 * unmodified Test Runner at `/placement/{token}`) -> result. Mirrors
 * `PlacementFlow`'s "one route, client-managed phases, server-computed
 * initial state" pattern exactly (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Routes/UI added").
 */
export function TryYourselfFlow({
  initialStatus,
  initialEmail,
}: {
  initialStatus: ActionResult<PublicFlowStatus>;
  initialEmail: string | null;
}) {
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [phase, setPhase] = useState<Phase>(() =>
    initialStatus.ok ? derivePhase(initialStatus.data, initialEmail) : { view: "error" }
  );

  async function refreshStatus(knownEmail: string | null) {
    const result = await getPublicFlowStatusAction();
    if (!result.ok) {
      setPhase({ view: "error" });
      return;
    }
    setPhase(derivePhase(result.data, knownEmail));
  }

  switch (phase.view) {
    case "email":
      return (
        <TryEmailStep
          onCodeSent={(sentEmail) => setPhase({ view: "code", email: sentEmail })}
        />
      );

    case "code":
      return (
        <TryCodeStep
          email={phase.email}
          onVerified={() => {
            setEmail(phase.email);
            void refreshStatus(phase.email);
          }}
        />
      );

    case "profile":
      return (
        <TryProfileStep
          email={phase.email}
          onSuccess={() => void refreshStatus(email ?? phase.email)}
        />
      );

    case "ready":
      return (
        <TryReadyStep
          mode="start"
          attemptNumber={phase.attemptNumber}
          testTitle={phase.testTitle}
          durationMinutes={Math.round(phase.durationSeconds / 60)}
          totalQuestions={phase.totalQuestions}
        />
      );

    case "resume":
      return <TryReadyStep mode="resume" attemptNumber={phase.attemptNumber} testTitle={phase.testTitle} />;

    case "elsewhere":
      return <TryReadyStep mode="elsewhere" attemptNumber={phase.attemptNumber} testTitle={phase.testTitle} />;

    case "result":
      return <TryResultStep result={phase.result} canRetake={phase.canRetake} />;

    case "unavailable":
      return <TryUnavailableStep />;

    case "error":
      return <TryUnavailableStep code="SERVER_ERROR" />;
  }
}
