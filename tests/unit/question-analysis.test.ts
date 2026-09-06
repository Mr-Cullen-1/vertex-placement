import { describe, expect, it } from "vitest";
import {
  buildQuestionAnalysis,
  toStudentQuestionReview,
} from "@/domain/results/question-analysis";

const questions = [
  {
    questionId: "q1",
    order: 1,
    prompt: "She ___ to school.",
    topic: "Grammar",
    difficultyBand: "Beginner",
    options: [
      { id: "q1-a", text: "go", isCorrect: false },
      { id: "q1-b", text: "goes", isCorrect: true },
    ],
  },
  {
    questionId: "q2",
    order: 2,
    prompt: "There ___ three books.",
    topic: "Grammar",
    difficultyBand: "Beginner",
    options: [
      { id: "q2-a", text: "is", isCorrect: false },
      { id: "q2-b", text: "are", isCorrect: true },
    ],
  },
  {
    questionId: "q3",
    order: 3,
    prompt: "Unanswered question.",
    topic: null,
    difficultyBand: null,
    options: [
      { id: "q3-a", text: "x", isCorrect: true },
      { id: "q3-b", text: "y", isCorrect: false },
    ],
  },
];

describe("buildQuestionAnalysis", () => {
  it("classifies correct/incorrect/unanswered and includes the full admin-only shape (questionId/topic/difficultyBand)", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "q1-b" }, // correct
      { questionId: "q2", selectedOptionId: "q2-a" }, // incorrect
      // q3: no answer at all
    ];
    const result = buildQuestionAnalysis(questions, answers);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      questionId: "q1",
      order: 1,
      topic: "Grammar",
      difficultyBand: "Beginner",
      selectedOptionText: "goes",
      correctOptionText: "goes",
      isAnswered: true,
      isCorrect: true,
    });
    expect(result[1]).toMatchObject({
      selectedOptionText: "is",
      correctOptionText: "are",
      isAnswered: true,
      isCorrect: false,
    });
    expect(result[2]).toMatchObject({
      selectedOptionText: null,
      correctOptionText: "x",
      isAnswered: false,
      isCorrect: false,
    });
  });

  it("treats an explicit null selection identically to no answer at all", () => {
    const answers = [{ questionId: "q1", selectedOptionId: null }];
    const result = buildQuestionAnalysis(questions, answers);
    expect(result[0].isAnswered).toBe(false);
    expect(result[0].isCorrect).toBe(false);
  });
});

describe("toStudentQuestionReview", () => {
  it("strips questionId/topic/difficultyBand and maps to a student-safe status", () => {
    const answers = [
      { questionId: "q1", selectedOptionId: "q1-b" },
      { questionId: "q2", selectedOptionId: "q2-a" },
    ];
    const analysis = buildQuestionAnalysis(questions, answers);
    const review = toStudentQuestionReview(analysis);

    expect(review).toEqual([
      { order: 1, prompt: "She ___ to school.", status: "CORRECT", selectedAnswerText: "goes", correctAnswerText: "goes" },
      { order: 2, prompt: "There ___ three books.", status: "INCORRECT", selectedAnswerText: "is", correctAnswerText: "are" },
      { order: 3, prompt: "Unanswered question.", status: "UNANSWERED", selectedAnswerText: null, correctAnswerText: "x" },
    ]);
    // No internal ids anywhere in the student-facing shape.
    expect(JSON.stringify(review)).not.toContain("questionId");
    expect(JSON.stringify(review)).not.toContain("q1-b");
  });

  it("sorts by question order regardless of input order", () => {
    const shuffled = [questions[2], questions[0], questions[1]];
    const analysis = buildQuestionAnalysis(shuffled, []);
    const review = toStudentQuestionReview(analysis);
    expect(review.map((r) => r.order)).toEqual([1, 2, 3]);
  });
});
