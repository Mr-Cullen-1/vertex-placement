import type { TopicPerformanceEntry } from "@/domain/scoring/types";
import type { AdminResultDetail, QuestionAnalysisEntry, StudentResultSummary } from "./types";

const STRONGEST_TOPICS_COUNT = 3;

export interface BuildStudentResultSummaryInput {
  attemptId: string;
  level: string | null;
  rawScore: number;
  totalQuestions: number;
  percentage: number;
  completionSeconds: number;
  topicPerformance: readonly TopicPerformanceEntry[];
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
    level: input.level,
    rawScore: input.rawScore,
    totalQuestions: input.totalQuestions,
    percentage: input.percentage,
    completionSeconds: input.completionSeconds,
    strongestTopics,
    summary: buildSummaryText(input),
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
  status: AdminResultDetail["status"];
  difficultyProgression: AdminResultDetail["difficultyProgression"];
  topicPerformance: AdminResultDetail["topicPerformance"];
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
    status: input.status,
    difficultyProgression: input.difficultyProgression,
    topicPerformance: input.topicPerformance,
    questionAnalysis: [...input.questionAnalysis].sort((a, b) => a.order - b.order),
  };
}
