"use server";

import {
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
  type AttemptFlowResult,
  type AttemptQuestionView,
} from "@/server/services/attempt.service";
import type { StudentResultSummary } from "@/domain/results/types";

/**
 * Thin Server Action wiring for the student attempt flow. No page/UI
 * consumes these yet (Phase 2) — they exist so the token-gated flow is a
 * real, callable interface, not just services reachable from tests.
 *
 * Every function takes the invitation TOKEN, never an attemptId — a
 * student has no session, so the token is the only thing the server can
 * trust as proof "this request is allowed to touch this attempt". An
 * attemptId is an internal database key, not a credential (see
 * /docs/PHASE_1.md "Security review" — "Do not trust attempt IDs from
 * the client").
 */

export async function startOrResumeAttemptAction(token: string): Promise<AttemptFlowResult> {
  return startOrResumeAttempt(token);
}

export async function getAttemptQuestionsAction(token: string): Promise<AttemptQuestionView[]> {
  return getAttemptQuestions(token);
}

export async function submitAnswerAction(
  token: string,
  questionId: string,
  selectedOptionId: string | null
): Promise<void> {
  return submitAnswer(token, { questionId, selectedOptionId });
}

export async function submitAttemptAction(token: string): Promise<StudentResultSummary> {
  return submitAttempt(token);
}
