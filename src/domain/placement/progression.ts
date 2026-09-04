/**
 * Placement *guidance* — deliberately separate from SCORE
 * (`src/domain/scoring/engine.ts`) and from the existing, optional,
 * percentage-based `PlacementBand` mechanism. See /docs/PHASE_2E.md
 * ("Why not score-percentage bands") for the full reasoning; short
 * version: the source ("Language Hub Placement Test", Macmillan
 * Education, 2019) states question-NUMBER ranges corresponding to
 * course levels, explicitly for teacher discretion, with only a few
 * non-linear illustrative score examples — not a formula. Converting
 * those examples into score-percentage cutoffs would misrepresent the
 * source (its own examples contradict a literal proportional mapping;
 * see the docs). This module instead implements exactly what the source
 * DOES give unambiguously: a fixed table of question-number ranges, and
 * a rule ("highest correctly-answered question number") for which range
 * a candidate has demonstrated. This is descriptive, not a certification
 * — every consumer of `ProgressionBand` must present it as guidance,
 * never as an official CEFR placement.
 */

export interface ProgressionBand {
  /** 1..6, lowest band first — display/evaluation order, not a score. */
  order: number;
  label: string;
  minQuestion: number;
  maxQuestion: number;
}

/** Fixed source progression ranges. Never derived from a score
 * percentage — see the module doc above. */
export const PROGRESSION_BANDS: readonly ProgressionBand[] = [
  { order: 1, label: "Beginner", minQuestion: 1, maxQuestion: 6 },
  { order: 2, label: "Elementary", minQuestion: 7, maxQuestion: 20 },
  { order: 3, label: "Pre-Intermediate", minQuestion: 21, maxQuestion: 34 },
  { order: 4, label: "Intermediate", minQuestion: 35, maxQuestion: 48 },
  { order: 5, label: "Upper Intermediate", minQuestion: 49, maxQuestion: 62 },
  { order: 6, label: "Advanced", minQuestion: 63, maxQuestion: 70 },
];

export function findProgressionBand(questionOrder: number): ProgressionBand | null {
  return PROGRESSION_BANDS.find((b) => questionOrder >= b.minQuestion && questionOrder <= b.maxQuestion) ?? null;
}

export interface ProgressionQuestionInput {
  questionId: string;
  /** The question's fixed position in the test (1-based) — NOT a score. */
  order: number;
  correctOptionId: string;
}

export interface ProgressionAnswerInput {
  questionId: string;
  selectedOptionId: string | null | undefined;
}

export interface AnswerBreakdown {
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  /** Null when zero questions were answered correctly — never defaulted
   * to a band. See /docs/PHASE_2E.md "Below Beginner". */
  highestCorrectQuestionOrder: number | null;
  /** Null exactly when `highestCorrectQuestionOrder` is null. */
  progressionBand: ProgressionBand | null;
}

/** Pure, deterministic. Never assumes a question was answered correctly
 * just because a later (harder) question was — every question is
 * checked against its own recorded answer, per the source's explicit
 * instruction not to assume progressive correctness. */
export function computeAnswerBreakdown(
  questions: readonly ProgressionQuestionInput[],
  answers: readonly ProgressionAnswerInput[]
): AnswerBreakdown {
  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

  let answeredCount = 0;
  let correctCount = 0;
  let highestCorrectQuestionOrder: number | null = null;

  for (const q of questions) {
    const selected = selectedByQuestionId.get(q.questionId);
    const isAnswered = selected != null;
    if (isAnswered) answeredCount += 1;

    const isCorrect = isAnswered && selected === q.correctOptionId;
    if (isCorrect) {
      correctCount += 1;
      if (highestCorrectQuestionOrder === null || q.order > highestCorrectQuestionOrder) {
        highestCorrectQuestionOrder = q.order;
      }
    }
  }

  return {
    answeredCount,
    correctCount,
    incorrectCount: answeredCount - correctCount,
    unansweredCount: questions.length - answeredCount,
    highestCorrectQuestionOrder,
    progressionBand:
      highestCorrectQuestionOrder === null ? null : findProgressionBand(highestCorrectQuestionOrder),
  };
}
