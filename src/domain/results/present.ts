import type { TopicPerformanceEntry } from "@/domain/scoring/types";
import type { AnswerBreakdown } from "@/domain/placement/progression";
import type { AdminResultDetail, QuestionAnalysisEntry, StudentResultSummary } from "./types";

const STRONGEST_TOPICS_COUNT = 3;

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
}

export function buildStudentResultSummary(
  input: BuildStudentResultSummaryInput
): StudentResultSummary {
  const strongestTopics = [...input.topicPerformance]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, STRONGEST_TOPICS_COUNT)
    .map(({ topic, percentage }) => ({ topic, percentage }));

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
  difficultyProgression: AdminResultDetail["difficultyProgression"];
  topicPerformance: AdminResultDetail["topicPerformance"];
  progression: AnswerBreakdown;
  questionAnalysis: readonly QuestionAnalysisEntry[];
}

export function buildAdminResultDetail(input: BuildAdminResultDetailInput): AdminResultDetail {
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
    difficultyProgression: input.difficultyProgression,
    topicPerformance: input.topicPerformance,
    progression: input.progression,
    questionAnalysis: [...input.questionAnalysis].sort((a, b) => a.order - b.order),
  };
}
