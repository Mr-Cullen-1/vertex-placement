import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import {
  confirmLanguageHubImport,
  previewLanguageHubImport,
} from "@/server/services/import.service";
import { publishPlacementTest } from "@/server/services/placement-test.service";
import { createAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";
import {
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { LANGUAGE_HUB_QUESTIONS } from "@/domain/import/sources/language-hub-2019";
import { validateNormalizedQuestions } from "@/domain/import/validate";
import { InvalidTestStateError } from "@/server/errors";
import type { NormalizedQuestion } from "@/domain/import/types";

const ANSWER_KEY: Record<number, string> = {
  1: "A", 2: "C", 3: "D", 4: "C", 5: "C", 6: "B", 7: "A", 8: "C", 9: "A", 10: "C",
  11: "D", 12: "C", 13: "D", 14: "C", 15: "D", 16: "B", 17: "D", 18: "A", 19: "C", 20: "C",
  21: "B", 22: "A", 23: "D", 24: "C", 25: "C", 26: "B", 27: "C", 28: "A", 29: "A", 30: "C",
  31: "D", 32: "B", 33: "C", 34: "B", 35: "D", 36: "B", 37: "A", 38: "C", 39: "D", 40: "B",
  41: "B", 42: "C", 43: "D", 44: "C", 45: "A", 46: "B", 47: "C", 48: "D", 49: "A", 50: "D",
  51: "B", 52: "A", 53: "C", 54: "B", 55: "B", 56: "D", 57: "C", 58: "A", 59: "D", 60: "A",
  61: "B", 62: "D", 63: "C", 64: "B", 65: "D", 66: "A", 67: "B", 68: "A", 69: "C", 70: "D",
};
const LETTERS = ["A", "B", "C", "D"];

const BAND_RANGES: [number, number, string][] = [
  [1, 6, "Beginner"],
  [7, 20, "Elementary"],
  [21, 34, "Pre-Intermediate"],
  [35, 48, "Intermediate"],
  [49, 62, "Upper Intermediate"],
  [63, 70, "Advanced"],
];

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2D — source dataset integrity (pure, no DB)", () => {
  it("has exactly 70 questions, no gaps, order 1..70", () => {
    expect(LANGUAGE_HUB_QUESTIONS).toHaveLength(70);
    const orders = LANGUAGE_HUB_QUESTIONS.map((q) => q.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 70 }, (_, i) => i + 1));
  });

  it("has exactly 280 options (4 per question)", () => {
    const total = LANGUAGE_HUB_QUESTIONS.reduce((sum, q) => sum + q.options.length, 0);
    expect(total).toBe(280);
  });

  it("has exactly one correct option per question", () => {
    for (const q of LANGUAGE_HUB_QUESTIONS) {
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it("matches the source answer key for all 70 questions", () => {
    for (const q of LANGUAGE_HUB_QUESTIONS) {
      const correctIndex = q.options.findIndex((o) => o.isCorrect);
      expect(LETTERS[correctIndex]).toBe(ANSWER_KEY[q.order]);
    }
  });

  it("excludes example question 0", () => {
    expect(LANGUAGE_HUB_QUESTIONS.find((q) => q.order === 0)).toBeUndefined();
  });

  it("assigns the six source progression bands correctly", () => {
    for (const q of LANGUAGE_HUB_QUESTIONS) {
      const expected = BAND_RANGES.find(([min, max]) => q.order >= min && q.order <= max)?.[2];
      expect(q.difficultyBand).toBe(expected);
    }
  });

  it("rejects an incomplete/invalid source (validator unit tests)", () => {
    const missingOne = LANGUAGE_HUB_QUESTIONS.slice(0, 69);
    expect(validateNormalizedQuestions(missingOne, 70).some((i) => i.severity === "ERROR")).toBe(true);

    const dupOrder: NormalizedQuestion[] = [
      ...LANGUAGE_HUB_QUESTIONS.slice(0, 69),
      { ...LANGUAGE_HUB_QUESTIONS[0]! },
    ];
    expect(validateNormalizedQuestions(dupOrder, 70).some((i) => i.severity === "ERROR")).toBe(true);

    const threeOptions: NormalizedQuestion[] = [
      { ...LANGUAGE_HUB_QUESTIONS[0]!, options: LANGUAGE_HUB_QUESTIONS[0]!.options.slice(0, 3) },
      ...LANGUAGE_HUB_QUESTIONS.slice(1),
    ];
    expect(validateNormalizedQuestions(threeOptions, 70).some((i) => i.severity === "ERROR")).toBe(true);

    const zeroCorrect: NormalizedQuestion[] = [
      {
        ...LANGUAGE_HUB_QUESTIONS[0]!,
        options: LANGUAGE_HUB_QUESTIONS[0]!.options.map((o) => ({ ...o, isCorrect: false })),
      },
      ...LANGUAGE_HUB_QUESTIONS.slice(1),
    ];
    expect(validateNormalizedQuestions(zeroCorrect, 70).some((i) => i.severity === "ERROR")).toBe(true);

    const twoCorrect: NormalizedQuestion[] = [
      {
        ...LANGUAGE_HUB_QUESTIONS[0]!,
        options: LANGUAGE_HUB_QUESTIONS[0]!.options.map((o, i) => ({ ...o, isCorrect: i < 2 })),
      },
      ...LANGUAGE_HUB_QUESTIONS.slice(1),
    ];
    expect(validateNormalizedQuestions(twoCorrect, 70).some((i) => i.severity === "ERROR")).toBe(true);

    expect(validateNormalizedQuestions(LANGUAGE_HUB_QUESTIONS, 70)).toHaveLength(0);
  });
});

describe("Phase 2D — import service (DB)", () => {
  it("Admin can preview and confirm the import (Correction pass: import authoring is Admin + Super Admin — see /docs/PRODUCT_RULES.md 'Roles')", async () => {
    const admin = await createUser("ADMIN");
    const preview = await previewLanguageHubImport(admin);
    expect(preview.isImportable).toBe(true);

    const result = await confirmLanguageHubImport(admin);
    expect(result.questionCount).toBe(70);
  });

  it("Super Admin can preview the import without persisting anything", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const preview = await previewLanguageHubImport(superAdmin);
    expect(preview.isImportable).toBe(true);
    expect(preview.alreadyImported).toBe(false);
    expect(preview.questions).toHaveLength(70);
    expect(await db.placementTest.count()).toBe(0);
  });

  it("Super Admin can confirm the import: 70 questions, 280 options, DRAFT test, 30 min", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const result = await confirmLanguageHubImport(superAdmin);

    expect(result.questionCount).toBe(70);
    expect(result.optionCount).toBe(280);

    const test = await db.placementTest.findUniqueOrThrow({ where: { id: result.testId } });
    expect(test.status).toBe("DRAFT");
    expect(test.durationSeconds).toBe(1800);
    expect(test.totalQuestionCount).toBe(70);

    const questionCount = await db.question.count({ where: { testId: result.testId } });
    expect(questionCount).toBe(70);
    const optionCount = await db.option.count({ where: { question: { testId: result.testId } } });
    expect(optionCount).toBe(280);

    const importJob = await db.importJob.findFirst({ where: { testId: result.testId } });
    expect(importJob?.status).toBe("IMPORTED");
    expect(importJob?.sourceType).toBe("PDF");
  });

  it("imported question order is exactly 1..70 in the database", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const result = await confirmLanguageHubImport(superAdmin);
    const questions = await db.question.findMany({
      where: { testId: result.testId },
      orderBy: { order: "asc" },
      select: { order: true },
    });
    expect(questions.map((q) => q.order)).toEqual(Array.from({ length: 70 }, (_, i) => i + 1));
  });

  it("every imported question has exactly one correct option matching the answer key", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const result = await confirmLanguageHubImport(superAdmin);
    const questions = await db.question.findMany({
      where: { testId: result.testId },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    });
    for (const q of questions) {
      const correct = q.options.filter((o) => o.isCorrect);
      expect(correct).toHaveLength(1);
      const correctIndex = q.options.findIndex((o) => o.isCorrect);
      expect(LETTERS[correctIndex]).toBe(ANSWER_KEY[q.order]);
    }
  });

  it("re-running the import does not create a duplicate test or duplicate questions", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const first = await confirmLanguageHubImport(superAdmin);

    await expect(confirmLanguageHubImport(superAdmin)).rejects.toThrow(InvalidTestStateError);

    const testCount = await db.placementTest.count({ where: { title: "Language Hub Placement Test" } });
    expect(testCount).toBe(1);
    const questionCount = await db.question.count({ where: { testId: first.testId } });
    expect(questionCount).toBe(70);
  });

  it("preview reports alreadyImported once the test exists", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await confirmLanguageHubImport(superAdmin);
    const preview = await previewLanguageHubImport(superAdmin);
    expect(preview.alreadyImported).toBe(true);
    expect(preview.isImportable).toBe(false);
  });
});

describe("Phase 2D — imported test works with existing attempt/scoring machinery", () => {
  it("option randomization and full-marks scoring (70/70) work against the imported test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const imported = await confirmLanguageHubImport(superAdmin);
    const published = await publishPlacementTest(superAdmin, imported.testId);
    expect(published.status).toBe("PUBLISHED");

    const assignment = await createAssignment(superAdmin, {
      testId: imported.testId,
      candidate: { firstName: "Language", lastName: "Hub", phoneNumber: "+998900001234", age: 25 },
    });
    const issued = await generateInvitation(superAdmin, assignment.id);

    await startOrResumeAttempt(issued.plaintextToken);
    const view = await getAttemptQuestions(issued.plaintextToken);
    expect(view).toHaveLength(70);

    // Existing per-attempt option-order randomization still applies: each
    // question's options are present but not necessarily in canonical
    // A/B/C/D order.
    for (const q of view) {
      expect(q.options).toHaveLength(4);
    }

    const dbQuestions = await db.question.findMany({
      where: { testId: imported.testId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    const correctOptionIdByQuestionId = new Map(
      dbQuestions.map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id])
    );

    for (const q of view) {
      await submitAnswer(issued.plaintextToken, {
        questionId: q.questionId,
        selectedOptionId: correctOptionIdByQuestionId.get(q.questionId)!,
      });
    }

    const summary = await submitAttempt(issued.plaintextToken);
    expect(summary.rawScore).toBe(70);
    expect(summary.totalQuestions).toBe(70);
    expect(summary.percentage).toBe(100);
  });
});
