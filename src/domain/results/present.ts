import type { TopicPerformanceEntry } from "@/domain/scoring/types";
import type { AnswerBreakdown } from "@/domain/placement/progression";
import {
  computeCourseLevelPerformance,
  summarizeCourseLevelStrengthWeakness,
  type CourseLevelAnswerInput,
  type CourseLevelPerformanceInput,
} from "@/domain/placement/course-level-performance";
import {
  buildQuestionAnalysis,
  toStudentQuestionReview,
  type QuestionAnalysisAnswerInput,
  type QuestionAnalysisQuestionInput,
} from "./question-analysis";
import type { AdminResultDetail, FinalPlacement, StudentResultSummary } from "./types";

const STRONGEST_TOPICS_COUNT = 3;

// A result is flagged as "limited coverage" once less than this share of
// the test was actually answered — see /docs/PHASE_2L_SCORING_POLICY.md
// ("Incomplete attempts"). Purely a UI disclosure; never changes `level`.
const LIMITED_COVERAGE_ANSWERED_RATIO = 0.5;

export interface BuildStudentResultSummaryInput {
  attemptId: string;
  candidateName: string;
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  topicPerformance: readonly TopicPerformanceEntry[];
  progression: AnswerBreakdown;
  autoSubmitted: boolean;
  /** Same questions/answers already fetched by the caller for scoring —
   * reused here to build the Detailed Analysis diagnostics, never a
   * second source of truth for correctness. */
  questions: readonly (QuestionAnalysisQuestionInput & CourseLevelPerformanceInput)[];
  answers: readonly (QuestionAnalysisAnswerInput & CourseLevelAnswerInput)[];
}

export function buildStudentResultSummary(
  input: BuildStudentResultSummaryInput
): StudentResultSummary {
  const strongestTopics = [...input.topicPerformance]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, STRONGEST_TOPICS_COUNT)
    .map(({ topic, percentage }) => ({ topic, percentage }));

  const courseLevelPerformance = computeCourseLevelPerformance(input.questions, input.answers);
  const strengthWeakness = summarizeCourseLevelStrengthWeakness(courseLevelPerformance);
  const questionAnalysis = buildQuestionAnalysis(input.questions, input.answers);
  const answeredRatio =
    input.totalQuestions === 0 ? 1 : input.progression.answeredCount / input.totalQuestions;

  return {
    attemptId: input.attemptId,
    candidateName: input.candidateName,
    level: input.level,
    rawScore: input.rawScore,
    totalQuestions: input.totalQuestions,
    percentage: input.percentage,
    completionSeconds: input.completionSeconds,
    strongestTopics,
    summary: buildSummaryText(input),
    progression: input.progression,
    autoSubmitted: input.autoSubmitted,
    detailedAnalysis: {
      courseLevelPerformance,
      strengthWeakness,
      questionReview: toStudentQuestionReview(questionAnalysis),
      limitedCoverage: answeredRatio < LIMITED_COVERAGE_ANSWERED_RATIO,
    },
  };
}

function buildSummaryText(input: BuildStudentResultSummaryInput): string {
  const roundedPercentage = Math.round(input.percentage);
  const levelClause = input.level ? ` — placed at ${input.level}` : "";
  return (
    `You answered ${input.rawScore} out of ${input.totalQuestions} questions ` +
    `correctly (${roundedPercentage}%)${levelClause}.`
  );
}

export interface BuildAdminResultDetailInput {
  attemptId: string;
  candidate: AdminResultDetail["candidate"];
  testTitle: string;
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  startedAt: string;
  completedAt: string;
  isCanonical: boolean;
  status: AdminResultDetail["status"];
  finalPlacement: FinalPlacement;
  difficultyProgression: AdminResultDetail["difficultyProgression"];
  topicPerformance: AdminResultDetail["topicPerformance"];
  progression: AnswerBreakdown;
  questions: readonly (QuestionAnalysisQuestionInput & CourseLevelPerformanceInput)[];
  answers: readonly (QuestionAnalysisAnswerInput & CourseLevelAnswerInput)[];
}

export function buildAdminResultDetail(input: BuildAdminResultDetailInput): AdminResultDetail {
  const questionAnalysis = buildQuestionAnalysis(input.questions, input.answers);
  const courseLevelPerformance = computeCourseLevelPerformance(input.questions, input.answers);
  const strengthWeakness = summarizeCourseLevelStrengthWeakness(courseLevelPerformance);

  return {
    attemptId: input.attemptId,
    candidate: input.candidate,
    testTitle: input.testTitle,
    level: input.level,
    rawScore: input.rawScore,
    totalQuestions: input.totalQuestions,
    percentage: input.percentage,
    completionSeconds: input.completionSeconds,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    isCanonical: input.isCanonical,
    status: input.status,
    finalPlacement: input.finalPlacement,
    difficultyProgression: input.difficultyProgression,
    topicPerformance: input.topicPerformance,
    progression: input.progression,
    courseLevelPerformance,
    strengthWeakness,
    questionAnalysis: [...questionAnalysis].sort((a, b) => a.order - b.order),
  };
}
