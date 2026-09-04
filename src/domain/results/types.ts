import type { DifficultyProgressionEntry, TopicPerformanceEntry } from "@/domain/scoring/types";
import type { AnswerBreakdown } from "@/domain/placement/progression";

/**
 * Result *presentation* — deliberately separate from the scoring engine
 * (`src/domain/scoring/engine.ts`). One `PlacementResult` row is the
 * single computed source; these are two different views over it, built
 * once at finalization time and reused everywhere a result is shown
 * (student summary, admin detail — and, later, analytics/Telegram/Excel,
 * none of which should ever recompute scoring independently). See
 * /docs/ARCHITECTURE.md ("Result engine").
 */

export interface StudentResultSummary {
  attemptId: string;
  candidateName: string;
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  /** Top-performing topics only — never per-question detail. The product
   * rule is explicit: students never see the answer key or which
   * individual questions were right/wrong. */
  strongestTopics: { topic: string; percentage: number }[];
  summary: string;
  /** Objective score (correct/incorrect/unanswered counts) plus
   * descriptive placement GUIDANCE — never a certification. See
   * /domain/placement/progression.ts. */
  progression: AnswerBreakdown;
  /** True if the timer, not the student, triggered submission — same
   * scoring pipeline either way (see /docs/PHASE_2E.md "Manual vs auto
   * submission"), shown only so the student understands what happened. */
  autoSubmitted: boolean;
}

export interface QuestionAnalysisEntry {
  questionId: string;
  order: number;
  prompt: string;
  topic: string | null;
  difficultyBand: string | null;
  selectedOptionText: string | null;
  correctOptionText: string;
  isAnswered: boolean;
  isCorrect: boolean;
}

export interface AdminResultDetail {
  attemptId: string;
  candidate: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    age: number;
    email: string | null;
  };
  testTitle: string;
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  startedAt: string;
  completedAt: string;
  isCanonical: boolean;
  status: "SUBMITTED" | "AUTO_SUBMITTED";
  difficultyProgression: DifficultyProgressionEntry[];
  topicPerformance: TopicPerformanceEntry[];
  progression: AnswerBreakdown;
  questionAnalysis: QuestionAnalysisEntry[];
}
