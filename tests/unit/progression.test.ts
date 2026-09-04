import { describe, expect, it } from "vitest";
import {
  computeAnswerBreakdown,
  findProgressionBand,
  PROGRESSION_BANDS,
  type ProgressionAnswerInput,
  type ProgressionQuestionInput,
} from "@/domain/placement/progression";

/** Builds `count` sequential questions, order 1..count, each with a
 * distinct correct option id "q{n}-correct". */
function buildQuestions(count: number): ProgressionQuestionInput[] {
  return Array.from({ length: count }, (_, i) => ({
    questionId: `q${i + 1}`,
    order: i + 1,
    correctOptionId: `q${i + 1}-correct`,
  }));
}

describe("findProgressionBand", () => {
  it("maps every one of the six source ranges correctly", () => {
    expect(findProgressionBand(1)?.label).toBe("Beginner");
    expect(findProgressionBand(6)?.label).toBe("Beginner");
    expect(findProgressionBand(7)?.label).toBe("Elementary");
    expect(findProgressionBand(20)?.label).toBe("Elementary");
    expect(findProgressionBand(21)?.label).toBe("Pre-Intermediate");
    expect(findProgressionBand(34)?.label).toBe("Pre-Intermediate");
    expect(findProgressionBand(35)?.label).toBe("Intermediate");
    expect(findProgressionBand(48)?.label).toBe("Intermediate");
    expect(findProgressionBand(49)?.label).toBe("Upper Intermediate");
    expect(findProgressionBand(62)?.label).toBe("Upper Intermediate");
    expect(findProgressionBand(63)?.label).toBe("Advanced");
    expect(findProgressionBand(70)?.label).toBe("Advanced");
  });

  it("returns null outside the 1-70 range — never invents a band", () => {
    expect(findProgressionBand(0)).toBeNull();
    expect(findProgressionBand(71)).toBeNull();
  });

  it("PROGRESSION_BANDS covers exactly the six source ranges with no gaps or overlaps", () => {
    expect(PROGRESSION_BANDS).toHaveLength(6);
    for (let q = 1; q <= 70; q++) {
      expect(findProgressionBand(q)).not.toBeNull();
    }
    const sorted = [...PROGRESSION_BANDS].sort((a, b) => a.order - b.order);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.minQuestion).toBe(sorted[i - 1]!.maxQuestion + 1);
    }
  });
});

describe("computeAnswerBreakdown — score cases (section 13)", () => {
  it("Case A: all 70 correct -> 70/70 correct, highest = 70, Advanced", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.correctOptionId,
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(70);
    expect(result.answeredCount).toBe(70);
    expect(result.incorrectCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.highestCorrectQuestionOrder).toBe(70);
    expect(result.progressionBand?.label).toBe("Advanced");
  });

  it("Case B: 0 correct -> highest = null, band = null (never invented)", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: "wrong-option",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(0);
    expect(result.highestCorrectQuestionOrder).toBeNull();
    expect(result.progressionBand).toBeNull();
  });

  it("Case C: 35 correct (first 35 questions) -> 35 correct, highest = 35, Intermediate", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q, i) => ({
      questionId: q.questionId,
      selectedOptionId: i < 35 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(35);
    expect(result.highestCorrectQuestionOrder).toBe(35);
    expect(result.progressionBand?.label).toBe("Intermediate");
  });

  it("Case D: 50 correct (first 50 questions) -> highest = 50, Upper Intermediate", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q, i) => ({
      questionId: q.questionId,
      selectedOptionId: i < 50 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(50);
    expect(result.highestCorrectQuestionOrder).toBe(50);
    expect(result.progressionBand?.label).toBe("Upper Intermediate");
  });

  it("Case E: partial attempt with unanswered questions — score only from correct answers", () => {
    // 65 answered, 50 correct, 5 incorrect (of the answered), 5 unanswered.
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions
      .slice(0, 65)
      .map((q, i) => ({
        questionId: q.questionId,
        selectedOptionId: i < 50 ? q.correctOptionId : "wrong",
      }));
    // questions[65..69] (5 of them) never appear in `answers` at all -> unanswered.
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.answeredCount).toBe(65);
    expect(result.correctCount).toBe(50);
    expect(result.incorrectCount).toBe(15);
    expect(result.unansweredCount).toBe(5);
  });

  it("Case F: answers distributed across bands — highest correct is the true maximum, not the count", () => {
    const questions = buildQuestions(70);
    // Correct only at scattered orders: 3, 18, 40, 65 — NOT a contiguous prefix.
    const correctOrders = new Set([3, 18, 40, 65]);
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: correctOrders.has(q.order) ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(4);
    expect(result.highestCorrectQuestionOrder).toBe(65);
    expect(result.progressionBand?.label).toBe("Advanced");
  });

  it("Case G: highest correct question = 18 -> Elementary progression (NOT 'score 18/70')", () => {
    const questions = buildQuestions(70);
    // Only question order 18 is correct — score is 1/70, not 18/70. The
    // resulting band must still be Elementary, driven purely by the
    // highest correctly-answered question NUMBER.
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.order === 18 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(1); // score is 1/70 — explicitly not 18
    expect(result.highestCorrectQuestionOrder).toBe(18);
    expect(result.progressionBand?.label).toBe("Elementary");
  });

  it("Case H: highest correct question = 27 -> Pre-Intermediate progression", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.order === 27 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.highestCorrectQuestionOrder).toBe(27);
    expect(result.progressionBand?.label).toBe("Pre-Intermediate");
  });

  it("Case I: highest correct question = 65 -> Advanced progression", () => {
    const questions = buildQuestions(70);
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.order === 65 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.highestCorrectQuestionOrder).toBe(65);
    expect(result.progressionBand?.label).toBe("Advanced");
  });
});

describe("computeAnswerBreakdown — edge cases", () => {
  it("never assumes a question before the highest correct one was also correct", () => {
    const questions = buildQuestions(10);
    // Only q10 correct; q1-q9 explicitly wrong (not just unanswered).
    const answers: ProgressionAnswerInput[] = questions.map((q) => ({
      questionId: q.questionId,
      selectedOptionId: q.order === 10 ? q.correctOptionId : "wrong",
    }));
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(9);
  });

  it("treats a null selectedOptionId as unanswered, not incorrect-but-answered", () => {
    const questions = buildQuestions(3);
    const answers: ProgressionAnswerInput[] = [
      { questionId: "q1", selectedOptionId: null },
      { questionId: "q2", selectedOptionId: "q2-correct" },
      { questionId: "q3", selectedOptionId: "wrong" },
    ];
    const result = computeAnswerBreakdown(questions, answers);
    expect(result.answeredCount).toBe(2);
    expect(result.unansweredCount).toBe(1);
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
  });

  it("a question with no answer row at all counts as unanswered", () => {
    const questions = buildQuestions(3);
    const result = computeAnswerBreakdown(questions, []);
    expect(result.answeredCount).toBe(0);
    expect(result.unansweredCount).toBe(3);
    expect(result.highestCorrectQuestionOrder).toBeNull();
  });

  it("empty question set is a valid, unscored state", () => {
    const result = computeAnswerBreakdown([], []);
    expect(result.answeredCount).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.highestCorrectQuestionOrder).toBeNull();
    expect(result.progressionBand).toBeNull();
  });
});
