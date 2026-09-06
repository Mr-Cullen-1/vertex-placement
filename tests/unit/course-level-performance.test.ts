import { describe, expect, it } from "vitest";
import {
  computeCourseLevelPerformance,
  qualitativeLabelFor,
  summarizeCourseLevelStrengthWeakness,
  type CourseLevelPerformanceInput,
} from "@/domain/placement/course-level-performance";

/** Builds `count` sequential questions (order 1..count), option "correct"
 * always the correct one. */
function buildQuestions(count: number): CourseLevelPerformanceInput[] {
  return Array.from({ length: count }, (_, i) => ({
    questionId: `q${i + 1}`,
    order: i + 1,
    correctOptionId: "correct",
  }));
}

describe("computeCourseLevelPerformance", () => {
  it("buckets a full 70-question attempt into the six fixed course-level ranges with correct/incorrect/unanswered/total", () => {
    const questions = buildQuestions(70);
    // Beginner (1-6): all correct. Elementary (7-20): all unanswered.
    // Everything else: all incorrect.
    const answers = questions.map((q) => {
      if (q.order <= 6) return { questionId: q.questionId, selectedOptionId: "correct" };
      if (q.order <= 20) return { questionId: q.questionId, selectedOptionId: null };
      return { questionId: q.questionId, selectedOptionId: "wrong" };
    });

    const result = computeCourseLevelPerformance(questions, answers);
    expect(result).toHaveLength(6);

    const beginner = result.find((r) => r.label === "Beginner")!;
    expect(beginner).toMatchObject({ correct: 6, incorrect: 0, unanswered: 0, total: 6 });
    expect(beginner.percentageOfTotal).toBe(100);
    expect(beginner.attemptedAccuracy).toBe(100);

    const elementary = result.find((r) => r.label === "Elementary")!;
    expect(elementary).toMatchObject({ correct: 0, incorrect: 0, unanswered: 14, total: 14 });
    expect(elementary.attemptedAccuracy).toBeNull();

    const preIntermediate = result.find((r) => r.label === "Pre-Intermediate")!;
    expect(preIntermediate).toMatchObject({ correct: 0, incorrect: 14, unanswered: 0, total: 14 });
    expect(preIntermediate.attemptedAccuracy).toBe(0);
  });

  it("never lets a question outside its range leak into another band's counts", () => {
    const questions = buildQuestions(20);
    const answers = questions.map((q) => ({ questionId: q.questionId, selectedOptionId: "correct" }));
    const result = computeCourseLevelPerformance(questions, answers);
    const beginner = result.find((r) => r.label === "Beginner")!;
    const elementary = result.find((r) => r.label === "Elementary")!;
    expect(beginner.total).toBe(6);
    expect(elementary.total).toBe(14);
    expect(beginner.correct + elementary.correct).toBe(20);
  });
});

describe("qualitativeLabelFor", () => {
  it("labels Strong at >=80% attempted accuracy, Developing at >=50%, else Needs improvement", () => {
    const make = (accuracy: number | null) => ({
      label: "x",
      order: 1,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      total: 0,
      percentageOfTotal: 0,
      attemptedAccuracy: accuracy,
    });
    expect(qualitativeLabelFor(make(100))).toBe("Strong");
    expect(qualitativeLabelFor(make(80))).toBe("Strong");
    expect(qualitativeLabelFor(make(79))).toBe("Developing");
    expect(qualitativeLabelFor(make(50))).toBe("Developing");
    expect(qualitativeLabelFor(make(49))).toBe("Needs improvement");
    expect(qualitativeLabelFor(make(0))).toBe("Needs improvement");
    expect(qualitativeLabelFor(make(null))).toBeNull();
  });
});

describe("summarizeCourseLevelStrengthWeakness — evidence-aware rule", () => {
  it("never names a band 'strongest' from a single lucky answer with almost nothing else attempted in it", () => {
    // Advanced: 1/1 attempted, 100% correct — but only 1 of 8 Advanced
    // questions were attempted (12.5% coverage), well under the 50%
    // coverage floor. This must NOT become "Strongest area: Advanced".
    const entries = [
      {
        label: "Beginner",
        order: 1,
        correct: 3,
        incorrect: 2,
        unanswered: 1,
        total: 6,
        percentageOfTotal: 50,
        attemptedAccuracy: 60,
      },
      {
        label: "Advanced",
        order: 6,
        correct: 1,
        incorrect: 0,
        unanswered: 7,
        total: 8,
        percentageOfTotal: 12.5,
        attemptedAccuracy: 100,
      },
    ];
    const summary = summarizeCourseLevelStrengthWeakness(entries);
    expect(summary.strongestLabel).toBe("Beginner");
    expect(summary.strongestLabel).not.toBe("Advanced");
  });

  it("reports no evidence when nothing meets the floor", () => {
    const entries = [
      {
        label: "Beginner",
        order: 1,
        correct: 1,
        incorrect: 0,
        unanswered: 5,
        total: 6,
        percentageOfTotal: 16.7,
        attemptedAccuracy: 100,
      },
    ];
    const summary = summarizeCourseLevelStrengthWeakness(entries);
    expect(summary.hasSufficientEvidence).toBe(false);
    expect(summary.strongestLabel).toBeNull();
    expect(summary.weakestLabel).toBeNull();
  });

  it("reports a strongest but no weakest when only one band has sufficient evidence", () => {
    const entries = [
      {
        label: "Beginner",
        order: 1,
        correct: 5,
        incorrect: 1,
        unanswered: 0,
        total: 6,
        percentageOfTotal: 83.3,
        attemptedAccuracy: 83.3,
      },
      {
        label: "Elementary",
        order: 2,
        correct: 0,
        incorrect: 1,
        unanswered: 13,
        total: 14,
        percentageOfTotal: 0,
        attemptedAccuracy: 0,
      },
    ];
    const summary = summarizeCourseLevelStrengthWeakness(entries);
    expect(summary.hasSufficientEvidence).toBe(true);
    expect(summary.strongestLabel).toBe("Beginner");
    expect(summary.weakestLabel).toBeNull();
  });

  it("reports both strongest and weakest when at least two bands have sufficient evidence", () => {
    const entries = [
      {
        label: "Beginner",
        order: 1,
        correct: 6,
        incorrect: 0,
        unanswered: 0,
        total: 6,
        percentageOfTotal: 100,
        attemptedAccuracy: 100,
      },
      {
        label: "Elementary",
        order: 2,
        correct: 2,
        incorrect: 12,
        unanswered: 0,
        total: 14,
        percentageOfTotal: 14.3,
        attemptedAccuracy: 14.3,
      },
    ];
    const summary = summarizeCourseLevelStrengthWeakness(entries);
    expect(summary.strongestLabel).toBe("Beginner");
    expect(summary.weakestLabel).toBe("Elementary");
  });
});
