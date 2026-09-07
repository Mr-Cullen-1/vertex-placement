import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import {
  confirmGenericImport,
  confirmLanguageHubImport,
  previewGenericImport,
} from "@/server/services/import.service";
import { InvalidTestStateError } from "@/server/errors";

function validPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    title: "Custom Grammar Placement Test",
    description: "A generically-imported test.",
    durationSeconds: 900,
    questions: [
      {
        order: 1,
        prompt: "She ___ to work every day.",
        options: [
          { text: "go", isCorrect: false },
          { text: "goes", isCorrect: true },
          { text: "going", isCorrect: false },
        ],
        difficultyBand: "Beginner",
        topic: "Grammar",
      },
      {
        order: 2,
        prompt: "They ___ finished the project yet.",
        options: [
          { text: "haven't", isCorrect: true },
          { text: "hasn't", isCorrect: false },
          { text: "didn't", isCorrect: false },
          { text: "wasn't", isCorrect: false },
        ],
        difficultyBand: "Intermediate",
        topic: "Grammar",
      },
      {
        order: 3,
        prompt: "By next year, she ___ here for a decade.",
        options: [
          { text: "will work", isCorrect: false },
          { text: "will have worked", isCorrect: true },
          { text: "works", isCorrect: false },
        ],
        difficultyBand: "Advanced",
        topic: "Tenses",
      },
    ],
    placementBands: [
      { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 49.99 },
      { order: 2, label: "Advanced", minPercentage: 50, maxPercentage: 100 },
    ],
    ...overrides,
  });
}

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2H — generic import authorization", () => {
  it("Admin can preview and confirm a generic import (Correction pass: import authoring is Admin + Super Admin — see /docs/PRODUCT_RULES.md 'Roles')", async () => {
    const admin = await createUser("ADMIN");
    const preview = await previewGenericImport(admin, "test.json", validPayload());
    expect(preview.isImportable).toBe(true);

    const result = await confirmGenericImport(admin, "test.json", validPayload());
    expect(await db.placementTest.count()).toBe(1);
    expect(result.questionCount).toBe(3);
  });
});

describe("Phase 2H — generic import preview", () => {
  it("Super Admin can preview without persisting anything", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const preview = await previewGenericImport(superAdmin, "grammar.json", validPayload());

    expect(preview.isImportable).toBe(true);
    expect(preview.title).toBe("Custom Grammar Placement Test");
    expect(preview.questions).toHaveLength(3);
    expect(preview.bandCount).toBe(2);
    expect(preview.titleConflict).toBe(false);
    expect(await db.placementTest.count()).toBe(0);
  });

  it("reports validation issues without throwing, for an admin-readable preview", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const preview = await previewGenericImport(
      superAdmin,
      "broken.json",
      validPayload({
        questions: [
          {
            order: 1,
            prompt: "Broken question",
            options: [
              { text: "A", isCorrect: false },
              { text: "B", isCorrect: false },
            ],
          },
        ],
      })
    );
    expect(preview.isImportable).toBe(false);
    expect(preview.issues.some((i) => /exactly 1 correct/i.test(i.message))).toBe(true);
  });

  it("flags (but does not block on) a title matching an existing test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await confirmGenericImport(superAdmin, "grammar.json", validPayload());

    const preview = await previewGenericImport(superAdmin, "grammar-2.json", validPayload());
    expect(preview.titleConflict).toBe(true);
    expect(preview.isImportable).toBe(true); // still importable — a warning, not a block
  });
});

describe("Phase 2H — generic import persistence (atomic, transactional)", () => {
  it("confirms atomically: test, questions, options, bands, and an ImportJob row all created together", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const result = await confirmGenericImport(superAdmin, "grammar.json", validPayload());

    expect(result.questionCount).toBe(3);
    expect(result.optionCount).toBe(3 + 4 + 3);
    expect(result.bandCount).toBe(2);

    const test = await db.placementTest.findUniqueOrThrow({ where: { id: result.testId } });
    expect(test.status).toBe("DRAFT");
    expect(test.durationSeconds).toBe(900);
    expect(test.totalQuestionCount).toBe(3);

    const questions = await db.question.findMany({
      where: { testId: result.testId },
      orderBy: { order: "asc" },
      include: { options: true, metadata: true },
    });
    expect(questions.map((q) => q.order)).toEqual([1, 2, 3]);
    expect(questions.every((q) => q.status === "PUBLISHED")).toBe(true);
    expect(questions[0]!.metadata?.difficultyBand).toBe("Beginner");

    const bands = await db.placementBand.findMany({ where: { testId: result.testId }, orderBy: { order: "asc" } });
    expect(bands.map((b) => b.label)).toEqual(["Beginner", "Advanced"]);

    const importJob = await db.importJob.findFirst({ where: { testId: result.testId } });
    expect(importJob?.status).toBe("IMPORTED");
    expect(importJob?.sourceType).toBe("JSON");
    expect(importJob?.fileName).toBe("grammar.json");
  });

  it("preserves question order exactly as given, including a non-sequential-looking but valid file", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const payload = JSON.parse(validPayload());
    // Reverse the array order in the file — order values (1,2,3) are what
    // must be preserved in the DB, not source array position.
    payload.questions = [...payload.questions].reverse();
    const result = await confirmGenericImport(superAdmin, "reversed.json", JSON.stringify(payload));

    const questions = await db.question.findMany({
      where: { testId: result.testId },
      orderBy: { order: "asc" },
      select: { order: true, prompt: true },
    });
    expect(questions.map((q) => q.order)).toEqual([1, 2, 3]);
    expect(questions[0]!.prompt).toBe("She ___ to work every day.");
  });

  it("a failed import (blocking validation error) creates nothing at all", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const beforeTests = await db.placementTest.count();
    const beforeQuestions = await db.question.count();
    const beforeImportJobs = await db.importJob.count();

    await expect(
      confirmGenericImport(
        superAdmin,
        "broken.json",
        validPayload({ questions: [{ order: 1, prompt: "Bad", options: [{ text: "A", isCorrect: false }] }] })
      )
    ).rejects.toThrow(InvalidTestStateError);

    expect(await db.placementTest.count()).toBe(beforeTests);
    expect(await db.question.count()).toBe(beforeQuestions);
    expect(await db.importJob.count()).toBe(beforeImportJobs);
  });

  it("malformed JSON is rejected before touching the database", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(confirmGenericImport(superAdmin, "broken.json", "{ not valid")).rejects.toThrow(
      InvalidTestStateError
    );
    expect(await db.placementTest.count()).toBe(0);
  });

  it("re-importing the same title creates a second, independent test rather than overwriting", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const first = await confirmGenericImport(superAdmin, "grammar.json", validPayload());
    const second = await confirmGenericImport(superAdmin, "grammar-2.json", validPayload());

    expect(second.testId).not.toBe(first.testId);
    expect(await db.placementTest.count({ where: { title: "Custom Grammar Placement Test" } })).toBe(2);

    const firstQuestions = await db.question.count({ where: { testId: first.testId } });
    const secondQuestions = await db.question.count({ where: { testId: second.testId } });
    expect(firstQuestions).toBe(3);
    expect(secondQuestions).toBe(3);
  });
});

describe("Phase 2H — generic import does not affect existing tests/results", () => {
  it("importing a generic JSON test leaves a previously-imported Language Hub test completely untouched", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const languageHub = await confirmLanguageHubImport(superAdmin);

    await confirmGenericImport(superAdmin, "grammar.json", validPayload());

    const languageHubTest = await db.placementTest.findUniqueOrThrow({ where: { id: languageHub.testId } });
    expect(languageHubTest.status).toBe("DRAFT");
    expect(languageHubTest.totalQuestionCount).toBe(70);
    expect(await db.question.count({ where: { testId: languageHub.testId } })).toBe(70);
    expect(await db.option.count({ where: { question: { testId: languageHub.testId } } })).toBe(280);

    // And the reverse: the two imports are fully independent tests.
    expect(await db.placementTest.count()).toBe(2);
  });
});
