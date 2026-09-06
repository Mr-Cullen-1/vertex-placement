import type { DifficultyProgressionEntry, TopicPerformanceEntry } from "@/domain/scoring/types";
import type { AnswerBreakdown } from "@/domain/placement/progression";
import type {
  CourseLevelPerformanceEntry,
  StrengthWeaknessSummary,
} from "@/domain/placement/course-level-performance";
import type { StudentQuestionReviewEntry } from "./question-analysis";

/**
 * Result *presentation* — deliberately separate from the scoring engine
 * (`src/domain/scoring/engine.ts`). One `PlacementResult` row is the
 * single computed source; these are two different views over it, built
 * once at finalization time and reused everywhere a result is shown
 * (student summary, admin detail — and, later, analytics/Telegram/Excel,
 * none of which should ever recompute scoring independently). See
 * /docs/ARCHITECTURE.md ("Result engine").
 */

/** Phase 2L — the collapsed-by-default "Detailed analysis" section on the
 * student result screen. Every field here is DIAGNOSTIC — none of it
 * determines `level` ("Recommended Level"), which is computed once,
 * upstream, from total correct score alone. See
 * /docs/PHASE_2L_SCORING_POLICY.md. */
export interface StudentDetailedAnalysis {
  courseLevelPerformance: CourseLevelPerformanceEntry[];
  strengthWeakness: StrengthWeaknessSummary;
  questionReview: StudentQuestionReviewEntry[];
  /** True when coverage is thin enough to warrant a neutral disclosure —
   * see /docs/PHASE_2L_SCORING_POLICY.md ("Incomplete attempts"). Never
   * changes `level`/scoring, purely a UI disclosure flag. */
  limitedCoverage: boolean;
}

export interface StudentResultSummary {
  attemptId: string;
  candidateName: string;
  /** The OFFICIAL automated placement recommendation — a configured
   * `PlacementBand` matched against TOTAL correct score (raw score or
   * percentage, per that band's own `scoringMode`), never influenced by
   * which specific question was answered correctly. Displayed to the
   * student as "Recommended Level" (see placement-result.tsx) — the field
   * is still named `level` internally to avoid an unrelated rename churn
   * across every consumer. */
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
  /** Phase 2L — collapsed by default, see StudentDetailedAnalysis. */
  detailedAnalysis: StudentDetailedAnalysis;
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

/** Administrative decision, separate from `level` — see
 * /docs/PHASE_2L_SCORING_POLICY.md ("Final Placement"). `label` is
 * whatever should be DISPLAYED as the institution's final placement:
 * the override if one exists, otherwise the Recommended Level itself.
 * `isOverridden` is the only way to tell those two cases apart. */
export interface FinalPlacement {
  label: string | null;
  isOverridden: boolean;
  setByName: string | null;
  setAt: string | null;
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
  /** OBJECTIVE RESULT — the Recommended Level (score-based `PlacementBand`
   * match), immutable, never edited here. See `finalPlacement` for the
   * separate administrative decision. */
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  startedAt: string;
  completedAt: string;
  isCanonical: boolean;
  status: "SUBMITTED" | "AUTO_SUBMITTED";
  /** ADMINISTRATIVE DECISION — see FinalPlacement. */
  finalPlacement: FinalPlacement;
  /** DIAGNOSTIC ANALYSIS below — difficultyProgression, topicPerformance,
   * progression, courseLevelPerformance, strengthWeakness,
   * questionAnalysis. None of these determine `level` or `finalPlacement`. */
  difficultyProgression: DifficultyProgressionEntry[];
  topicPerformance: TopicPerformanceEntry[];
  progression: AnswerBreakdown;
  courseLevelPerformance: CourseLevelPerformanceEntry[];
  strengthWeakness: StrengthWeaknessSummary;
  questionAnalysis: QuestionAnalysisEntry[];
}
