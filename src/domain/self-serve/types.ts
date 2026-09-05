import type { StudentResultSummary } from "@/domain/results/types";

/**
 * The one derived eligibility state for a verified public self-service
 * identity (see /docs/PHASE_2J_TRY_YOURSELF.md "Eligibility states").
 * Nothing here is persisted — `getEligibility` (self-serve.service.ts)
 * recomputes it from `PlacementAssignment`/`PlacementResult` rows every
 * time, the same "derived, never duplicated" approach `PlacementStatus`
 * already uses for the admin-assigned flow (attempt.service.ts).
 */
export type EligibilityState =
  | { kind: "PUBLIC_TEST_UNAVAILABLE" }
  | { kind: "PROFILE_REQUIRED" }
  | {
      kind: "READY";
      attemptNumber: 1 | 2;
      testTitle: string;
      durationSeconds: number;
      totalQuestions: number;
    }
  | { kind: "IN_PROGRESS"; attemptNumber: 1 | 2; testTitle: string }
  | { kind: "ATTEMPT_COMPLETE"; attemptNumber: 1; result: StudentResultSummary }
  | { kind: "LIMIT_REACHED"; result: StudentResultSummary };

/**
 * The client-facing status for `/try` — `EligibilityState` plus the two
 * states that only exist once cookies enter the picture (no session yet;
 * an in-progress attempt whose token this browser doesn't hold — see
 * /lib/self-serve-session.ts). Composed in
 * `src/app/try/page.tsx`/`self-serve-actions.ts`, the one place that
 * reads both the session and the service layer — `EligibilityState`
 * itself stays framework-free.
 */
export type PublicFlowStatus =
  | { kind: "EMAIL_REQUIRED" }
  | { kind: "IN_PROGRESS_ELSEWHERE"; attemptNumber: 1 | 2; testTitle: string }
  | EligibilityState;
