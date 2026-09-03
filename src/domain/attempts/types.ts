/**
 * Attempt lifecycle. The timer is server-authoritative: `expiresAt` is
 * computed once when the attempt starts and is what auto-submission is
 * judged against — never a client-reported elapsed time.
 *
 * MVP enforcement is lazy, not scheduled: there is no cron/sweep job that
 * walks IN_PROGRESS attempts. The client runs its own countdown (for UX,
 * and to call SUBMIT proactively at 00:00), but every request that reads
 * or mutates an attempt (fetch question, answer, submit) MUST re-check
 * `now >= expiresAt` server-side first. If an IN_PROGRESS attempt is
 * accessed past its deadline — via any such request, or a would-be late
 * SUBMIT — the handler finalizes it as AUTO_SUBMIT and computes the result
 * before doing anything else. This keeps the server authoritative without
 * needing background infrastructure in the MVP.
 */
export type AttemptTransition =
  | "START" // valid invitation consumed -> attempt IN_PROGRESS
  | "ANSWER" // upsert a PlacementAnswer, does not change attempt status
  | "SUBMIT" // student-initiated -> SUBMITTED
  | "AUTO_SUBMIT" // now >= expiresAt, discovered lazily on access -> AUTO_SUBMITTED
  | "ABANDON"; // e.g. superseded by an admin action; reserved for future use

export interface StartAttemptInput {
  invitationToken: string;
}

export interface StartAttemptResult {
  attemptId: string;
  expiresAt: string; // ISO timestamp — the single source of truth for the frontend timer
  totalQuestions: number;
}

export interface SubmitAnswerInput {
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null; // null clears/skips the answer
}
