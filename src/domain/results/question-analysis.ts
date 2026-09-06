import type { QuestionAnalysisEntry } from "./types";

/**
 * ONE pure builder for per-question analysis, shared by the admin result
 * detail view and the student "Review your answers" detailed-analysis
 * section (Phase 2L) — never two separate implementations that could
 * silently diverge. The student-facing view (`toStudentQuestionReview`)
 * simply narrows the same computed entries, stripping `questionId`,
 * `topic`, and `difficultyBand` (internal/admin-only fields — see
 * /docs/PRODUCT_RULES.md "Security"). Answer-key exposure to a student is
 * an explicit Phase 2L product decision, gated entirely by WHEN this is
 * called: only from a completed attempt's result-building path, which
 * itself is only reachable via the student's own token/session-verified
 * access (see attempt.service.ts callers) — never before an attempt is
 * finalized, never for another candidate's attempt.
 */

export interface QuestionAnalysisQuestionInput {
  questionId: string;
  order: number;
  prompt: string;
  topic: string | null;
  difficultyBand: string | null;
  options: readonly { id: string; text: string; isCorrect: boolean }[];
}

export interface QuestionAnalysisAnswerInput {
  questionId: string;
  selectedOptionId: string | null | undefined;
}

export function buildQuestionAnalysis(
  questions: readonly QuestionAnalysisQuestionInput[],
  answers: readonly QuestionAnalysisAnswerInput[]
): QuestionAnalysisEntry[] {
  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

  return questions.map((question) => {
    const correctOption = question.options.find((o) => o.isCorrect);
    const selectedOptionId = selectedByQuestionId.get(question.questionId) ?? null;
    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    return {
      questionId: question.questionId,
      order: question.order,
      prompt: question.prompt,
      topic: question.topic,
      difficultyBand: question.difficultyBand,
      selectedOptionText: selectedOption?.text ?? null,
      correctOptionText: correctOption?.text ?? "",
      isAnswered: selectedOptionId !== null,
      isCorrect: Boolean(selectedOption && correctOption && selectedOption.id === correctOption.id),
    };
  });
}

export type QuestionReviewStatus = "CORRECT" | "INCORRECT" | "UNANSWERED";

export interface StudentQuestionReviewEntry {
  order: number;
  prompt: string;
  status: QuestionReviewStatus;
  /** Null exactly when status is "UNANSWERED". */
  selectedAnswerText: string | null;
  correctAnswerText: string;
}

/** Narrows admin-computed analysis to the student-safe shape. No
 * `questionId`/`topic`/`difficultyBand` — `order` is the only identifier,
 * and it's already shown to the student throughout the test itself. */
export function toStudentQuestionReview(
  entries: readonly QuestionAnalysisEntry[]
): StudentQuestionReviewEntry[] {
  return [...entries]
    .sort((a, b) => a.order - b.order)
    .map((e) => ({
      order: e.order,
      prompt: e.prompt,
      status: !e.isAnswered ? "UNANSWERED" : e.isCorrect ? "CORRECT" : "INCORRECT",
      selectedAnswerText: e.isAnswered ? e.selectedOptionText : null,
      correctAnswerText: e.correctOptionText,
    }));
}
