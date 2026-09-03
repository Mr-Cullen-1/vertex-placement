"use server";

import {
  getAttemptQuestions,
  getPlacementStatus,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
  type AttemptFlowResult,
  type AttemptQuestionView,
  type PlacementStatus,
} from "@/server/services/attempt.service";
import { updateCandidateForToken, type CandidateInfo } from "@/server/services/invitation.service";
import type { CandidateInput } from "@/domain/candidate/schema";
import type { StudentResultSummary } from "@/domain/results/types";
import { runAction, type ActionResult } from "./action-result";

/**
 * Server Action wiring for the student attempt flow — the only interface
 * `src/app/placement/[token]` uses to reach the domain/service layer (see
 * /docs/PHASE_2A.md). Every function takes the invitation TOKEN, never an
 * attemptId — a student has no session, so the token is the only thing
 * the server can trust as proof a request is allowed to touch a given
 * attempt (see /docs/PHASE_1.md "Security review"). Every function
 * returns an `ActionResult`, never throws across the client boundary —
 * see action-result.ts.
 */

export async function getPlacementStatusAction(token: string): Promise<ActionResult<PlacementStatus>> {
  return runAction(() => getPlacementStatus(token));
}

export async function startOrResumeAttemptAction(
  token: string
): Promise<ActionResult<AttemptFlowResult>> {
  return runAction(() => startOrResumeAttempt(token));
}

export async function getAttemptQuestionsAction(
  token: string
): Promise<ActionResult<AttemptQuestionView[]>> {
  return runAction(() => getAttemptQuestions(token));
}

export async function submitAnswerAction(
  token: string,
  questionId: string,
  selectedOptionId: string | null
): Promise<ActionResult<void>> {
  return runAction(() => submitAnswer(token, { questionId, selectedOptionId }));
}

export async function submitAttemptAction(
  token: string
): Promise<ActionResult<StudentResultSummary>> {
  return runAction(() => submitAttempt(token));
}

export type CandidateFormInput = CandidateInput;

export async function updateCandidateAction(
  token: string,
  input: CandidateFormInput
): Promise<ActionResult<CandidateInfo>> {
  return runAction(() => updateCandidateForToken(token, input));
}
