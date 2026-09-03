/**
 * Attempt lifecycle. The timer is server-authoritative: `expiresAt` is
 * computed once when the attempt starts and is what auto-submission is
 * judged against — never a client-reported elapsed time.
 */

export type AttemptTransition =
  | "START" // valid invitation consumed -> attempt IN_PROGRESS
  | "ANSWER" // upsert a PlacementAnswer, does not change attempt status
  | "SUBMIT" // student-initiated -> SUBMITTED
  | "AUTO_SUBMIT" // server deadline reached -> AUTO_SUBMITTED
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
