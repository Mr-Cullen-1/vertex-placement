import { describe, expect, it } from "vitest";
import { computeScoring, type ScoringBandInput, type ScoringQuestionInput } from "@/domain/scoring/engine";

const questions: ScoringQuestionInput[] = [
  { questionId: "q1", correctOptionId: "q1-correct", difficultyBand: "Beginner", topic: "Grammar" },
  { questionId: "q2", correctOptionId: "q2-correct", difficultyBand: "Beginner", topic: "Grammar" },
  { questionId: "q3", correctOptionId: "q3-correct", difficultyBand: "Elementary", topic: "Vocabulary" },
  { questionId: "q4", correctOptionId: "q4-correct", difficultyBand: "Elementary", topic: "Vocabulary" },
];

const bands: ScoringBandInput[] = [
  { id: "band-low", order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 49.99 },
  { id: "band-high", order: 2, label: "Advanced", minPercentage: 50, maxPercentage: 100 },
];

describe("computeScoring", () => {
  it("scores all correct answers as 100%", () => {
    const answers = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.correctOptionId,
    }));
    const result = computeScoring(questions, answers, bands);
    expect(result.rawScore).toEqual({ rawScore: 4, totalQuestions: 4, percentage: 100 });
    expect(result.placementBand).toEqual({ placementBandId: "band-high", label: "Advanced" });
  });

  it("scores all incorrect answers as 0%", () => {
    const answers = questions.map((q) => ({ questionId: q.questionId, selectedOptionId: "wrong" }));
    const result = computeScoring(questions, answers, bands);
    expect(result.rawScore).toEqual({ rawScore: 0, totalQuestions: 4, percentage: 0 });
    expect(result.placementBand).toEqual({ placementBandId: "band-low", label: "Beginner" });
  });

  it("scores a partially-correct attempt proportionally", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "q1-correct" },
      { questionId: "q2", selectedOptionId: "wrong" },
      { questionId: "q3", selectedOptionId: "q3-correct" },
      { questionId: "q4", selectedOptionId: "wrong" },
    ];
    const result = computeScoring(questions, answers, bands);
    expect(result.rawScore).toEqual({ rawScore: 2, totalQuestions: 4, percentage: 50 });
  });

  it("treats a missing answer (unanswered/skipped question) as incorrect, never a crash", () => {
    const answers = [{ questionId: "q1", selectedOptionId: "q1-correct" }]; // q2-q4 never answered
    const result = computeScoring(questions, answers, bands);
    expect(result.rawScore).toEqual({ rawScore: 1, totalQuestions: 4, percentage: 25 });
  });

  it("treats an explicit null selection (cleared answer) as incorrect", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: null },
      { questionId: "q2", selectedOptionId: "q2-correct" },
    ];
    const result = computeScoring(questions, answers, bands);
    expect(result.rawScore.rawScore).toBe(1);
  });

  it("groups difficulty progression and topic performance by first-occurrence order", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "q1-correct" },
      { questionId: "q2", selectedOptionId: "wrong" },
      { questionId: "q3", selectedOptionId: "q3-correct" },
      { questionId: "q4", selectedOptionId: "q4-correct" },
    ];
    const result = computeScoring(questions, answers, bands);
    expect(result.difficultyProgression).toEqual([
      { band: "Beginner", correct: 1, total: 2 },
      { band: "Elementary", correct: 2, total: 2 },
    ]);
    expect(result.topicPerformance).toEqual([
      { topic: "Grammar", correct: 1, total: 2, percentage: 50 },
      { topic: "Vocabulary", correct: 2, total: 2, percentage: 100 },
    ]);
  });

  it("returns a null placement band when no configured band covers the percentage", () => {
    const answers = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.correctOptionId,
    }));
    const result = computeScoring(questions, answers, []); // no bands configured for this test
    expect(result.placementBand).toBeNull();
  });

  it("never invents a placement label — an empty band list is a valid, unscored state", () => {
    const result = computeScoring([], [], []);
    expect(result.rawScore).toEqual({ rawScore: 0, totalQuestions: 0, percentage: 0 });
    expect(result.placementBand).toBeNull();
  });
});
