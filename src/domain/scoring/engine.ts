import type {
  DifficultyProgressionEntry,
  PlacementBandMatch,
  RawScoreResult,
  ScoringOutput,
  TopicPerformanceEntry,
} from "./types";

/**
 * Pure scoring engine — no Prisma, no Next.js, no React. The service
 * layer (`src/server/services/attempt.service.ts`) is the only caller,
 * and it's the same call for both manual submission and auto-submission
 * (see /docs/PHASE_1.md "Submission pipeline") so there is exactly one
 * place scoring can diverge from itself.
 *
 * Deliberately does NOT hard-code CEFR cutoffs or Macmillan-specific
 * claims — `bands` is caller-supplied, per-test configuration. See
 * /docs/PRODUCT_RULES.md ("Scoring & placement").
 */

export interface ScoringQuestionInput {
  questionId: string;
  correctOptionId: string;
  difficultyBand: string | null;
  topic: string | null;
}

export interface ScoringAnswerInput {
  questionId: string;
  selectedOptionId: string | null;
}

export interface ScoringBandInput {
  id: string;
  label: string;
  order: number;
  minPercentage: number;
  maxPercentage: number;
}

export function computeScoring(
  questions: readonly ScoringQuestionInput[],
  answers: readonly ScoringAnswerInput[],
  bands: readonly ScoringBandInput[]
): ScoringOutput {
  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

  const rawScore = computeRawScore(questions, selectedByQuestionId);
  const difficultyProgression = computeDifficultyProgression(questions, selectedByQuestionId);
  const topicPerformance = computeTopicPerformance(questions, selectedByQuestionId);
  const placementBand = matchPlacementBand(rawScore.percentage, bands);

  return { rawScore, difficultyProgression, topicPerformance, placementBand };
}

function isCorrectAnswer(
  question: ScoringQuestionInput,
  selectedByQuestionId: Map<string, string | null | undefined>
): boolean {
  const selectedOptionId = selectedByQuestionId.get(question.questionId);
  return selectedOptionId != null && selectedOptionId === question.correctOptionId;
}

function computeRawScore(
  questions: readonly ScoringQuestionInput[],
  selectedByQuestionId: Map<string, string | null | undefined>
): RawScoreResult {
  const totalQuestions = questions.length;
  const rawScore = questions.reduce(
    (count, q) => count + (isCorrectAnswer(q, selectedByQuestionId) ? 1 : 0),
    0
  );
  const percentage = totalQuestions === 0 ? 0 : (rawScore / totalQuestions) * 100;
  return { rawScore, totalQuestions, percentage };
}

/** Buckets preserve first-occurrence order, which — because
 * Question.order is fixed and progressively difficult — naturally yields
 * bands/topics in test order (Beginner before Elementary, etc.) without
 * hard-coding that sequence here. */
function computeDifficultyProgression(
  questions: readonly ScoringQuestionInput[],
  selectedByQuestionId: Map<string, string | null | undefined>
): DifficultyProgressionEntry[] {
  const buckets = new Map<string, { correct: number; total: number }>();
  for (const question of questions) {
    const band = question.difficultyBand ?? "Unspecified";
    const bucket = buckets.get(band) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (isCorrectAnswer(question, selectedByQuestionId)) bucket.correct += 1;
    buckets.set(band, bucket);
  }
  return Array.from(buckets.entries()).map(([band, { correct, total }]) => ({
    band,
    correct,
    total,
  }));
}

function computeTopicPerformance(
  questions: readonly ScoringQuestionInput[],
  selectedByQuestionId: Map<string, string | null | undefined>
): TopicPerformanceEntry[] {
  const buckets = new Map<string, { correct: number; total: number }>();
  for (const question of questions) {
    const topic = question.topic ?? "Unspecified";
    const bucket = buckets.get(topic) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (isCorrectAnswer(question, selectedByQuestionId)) bucket.correct += 1;
    buckets.set(topic, bucket);
  }
  return Array.from(buckets.entries()).map(([topic, { correct, total }]) => ({
    topic,
    correct,
    total,
    percentage: total === 0 ? 0 : (correct / total) * 100,
  }));
}

function matchPlacementBand(
  percentage: number,
  bands: readonly ScoringBandInput[]
): PlacementBandMatch | null {
  const sorted = [...bands].sort((a, b) => a.order - b.order);
  const match = sorted.find(
    (band) => percentage >= band.minPercentage && percentage <= band.maxPercentage
  );
  return match ? { placementBandId: match.id, label: match.label } : null;
}
