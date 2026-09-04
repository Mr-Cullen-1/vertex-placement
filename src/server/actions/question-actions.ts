"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  createQuestion,
  deleteQuestion,
  publishQuestion,
  reorderQuestions,
  updateQuestion,
  type CreateQuestionInput,
  type UpdateQuestionInput,
} from "@/server/services/question.service";

/** Super Admin-only Server Actions for Question/Option/Metadata authoring —
 * enforced in the service layer (`assertPermission`), not here. */

export async function createQuestionAction(testId: string, input: CreateQuestionInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createQuestion(actor, testId, input);
  });
}

export async function updateQuestionAction(questionId: string, input: UpdateQuestionInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return updateQuestion(actor, questionId, input);
  });
}

export async function publishQuestionAction(questionId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return publishQuestion(actor, questionId);
  });
}

export async function deleteQuestionAction(questionId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return deleteQuestion(actor, questionId);
  });
}

export async function reorderQuestionsAction(testId: string, orderedQuestionIds: string[]) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return reorderQuestions(actor, testId, orderedQuestionIds);
  });
}
