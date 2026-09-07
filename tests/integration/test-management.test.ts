import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import {
  createPlacementTest,
  publishPlacementTest,
  updatePlacementTest,
  setPublicSelfServiceTest,
  clearPublicSelfServiceTest,
  getPublicSelfServiceTest,
} from "@/server/services/placement-test.service";
import {
  createQuestion,
  deleteQuestion,
  listQuestionsForTest,
  publishQuestion,
  reorderQuestions,
  updateQuestion,
} from "@/server/services/question.service";
import {
  createPlacementBand,
  deletePlacementBand,
  updatePlacementBand,
} from "@/server/services/placement-band.service";
import { InvalidTestStateError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

function baseOptions(correctIndex: number) {
  return [0, 1, 2, 3].map((i) => ({
    text: `Option ${i + 1}`,
    isCorrect: i === correctIndex,
    order: i + 1,
  }));
}

describe("Phase 2C — test creation and editing", () => {
  it("Super Admin can create a draft test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "New test",
      durationSeconds: 1800,
      totalQuestionCount: 10,
    });
    expect(test.status).toBe("DRAFT");
  });

  it("Admin can create a test (Correction pass: test authoring is Admin + Super Admin, not Super-Admin-only — see /docs/PRODUCT_RULES.md 'Roles')", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Admin-authored test",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    expect(test.status).toBe("DRAFT");
  });

  it("Super Admin can edit a draft test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "Draft",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const updated = await updatePlacementTest(superAdmin, test.id, { title: "Renamed" });
    expect(updated.title).toBe("Renamed");
  });

  it("cannot edit a test once it is published", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "Will publish",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const question = await createQuestion(superAdmin, test.id, {
      order: 1,
      prompt: "Q1",
      options: baseOptions(0),
    });
    await publishQuestion(superAdmin, question.id);
    await publishPlacementTest(superAdmin, test.id);

    await expect(updatePlacementTest(superAdmin, test.id, { title: "Hijack" })).rejects.toThrow(
      InvalidTestStateError
    );
  });

  it("cannot publish a test with zero published questions", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "Empty",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    await expect(publishPlacementTest(superAdmin, test.id)).rejects.toThrow(InvalidTestStateError);
  });

  it("Admin can publish a test", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Admin-published",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const question = await createQuestion(admin, test.id, {
      order: 1,
      prompt: "Q1",
      options: baseOptions(0),
    });
    await publishQuestion(admin, question.id);
    const published = await publishPlacementTest(admin, test.id);
    expect(published.status).toBe("PUBLISHED");
  });
});

describe("Correction pass — Admin can designate the public Try Yourself test", () => {
  it("Admin can set and clear the public self-service test", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Admin public-test fixture",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const question = await createQuestion(admin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
    await publishQuestion(admin, question.id);
    await publishPlacementTest(admin, test.id);

    await setPublicSelfServiceTest(admin, test.id);
    const publicTest = await getPublicSelfServiceTest();
    expect(publicTest?.id).toBe(test.id);

    await clearPublicSelfServiceTest(admin, test.id);
    expect(await getPublicSelfServiceTest()).toBeNull();
  });

  it("setting a second test public unsets the first (exactly one public test at a time)", async () => {
    const admin = await createUser("ADMIN");
    async function publishedTest(title: string) {
      const test = await createPlacementTest(admin, { title, durationSeconds: 1800, totalQuestionCount: 1 });
      const question = await createQuestion(admin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
      await publishQuestion(admin, question.id);
      return publishPlacementTest(admin, test.id);
    }
    const testA = await publishedTest("A");
    const testB = await publishedTest("B");

    await setPublicSelfServiceTest(admin, testA.id);
    await setPublicSelfServiceTest(admin, testB.id);

    const publicTest = await getPublicSelfServiceTest();
    expect(publicTest?.id).toBe(testB.id);
  });
});

describe("Phase 2C — question authoring", () => {
  it("Super Admin can create and edit a question", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 2,
    });
    const question = await createQuestion(superAdmin, test.id, {
      order: 1,
      prompt: "Original",
      options: baseOptions(0),
      metadata: { difficultyBand: "Beginner", topic: "Grammar" },
    });
    expect(question.options).toHaveLength(4);

    const updated = await updateQuestion(superAdmin, question.id, { prompt: "Edited" });
    expect(updated.prompt).toBe("Edited");
  });

  it("rejects a question with zero correct options", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    await expect(
      createQuestion(superAdmin, test.id, {
        order: 1,
        prompt: "Bad",
        options: [
          { text: "A", isCorrect: false, order: 1 },
          { text: "B", isCorrect: false, order: 2 },
        ],
      })
    ).rejects.toThrow(InvalidTestStateError);
  });

  it("rejects a question with two correct options", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    await expect(
      createQuestion(superAdmin, test.id, {
        order: 1,
        prompt: "Bad",
        options: [
          { text: "A", isCorrect: true, order: 1 },
          { text: "B", isCorrect: true, order: 2 },
        ],
      })
    ).rejects.toThrow(InvalidTestStateError);
  });

  it("Admin can create, edit, delete, reorder, and publish questions", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 2,
    });
    const q1 = await createQuestion(admin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
    const q2 = await createQuestion(admin, test.id, { order: 2, prompt: "Q2", options: baseOptions(0) });

    const updated = await updateQuestion(admin, q1.id, { prompt: "Q1 edited" });
    expect(updated.prompt).toBe("Q1 edited");

    await reorderQuestions(admin, test.id, [q2.id, q1.id]);
    const reordered = await listQuestionsForTest(admin, test.id);
    expect(reordered.map((q) => q.id)).toEqual([q2.id, q1.id]);

    await publishQuestion(admin, q1.id);
    await deleteQuestion(admin, q2.id); // still draft — deletable
  });

  it("can delete a question while the test is still draft", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const question = await createQuestion(superAdmin, test.id, {
      order: 1,
      prompt: "Q1",
      options: baseOptions(0),
    });
    await deleteQuestion(superAdmin, question.id);
    await expect(updateQuestion(superAdmin, question.id, { prompt: "gone" })).rejects.toThrow();
  });

  it("cannot delete a question once the test is published", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const question = await createQuestion(superAdmin, test.id, {
      order: 1,
      prompt: "Q1",
      options: baseOptions(0),
    });
    await publishQuestion(superAdmin, question.id);
    await publishPlacementTest(superAdmin, test.id);

    await expect(deleteQuestion(superAdmin, question.id)).rejects.toThrow(InvalidTestStateError);
  });

  it("reorders questions and renumbers them 1..N", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 3,
    });
    const q1 = await createQuestion(superAdmin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
    const q2 = await createQuestion(superAdmin, test.id, { order: 2, prompt: "Q2", options: baseOptions(0) });
    const q3 = await createQuestion(superAdmin, test.id, { order: 3, prompt: "Q3", options: baseOptions(0) });

    await reorderQuestions(superAdmin, test.id, [q3.id, q1.id, q2.id]);

    const reordered = await listQuestionsForTest(superAdmin, test.id);
    expect(reordered.map((q) => q.id)).toEqual([q3.id, q1.id, q2.id]);
    expect(reordered.map((q) => q.order)).toEqual([1, 2, 3]);
  });

  it("rejects reordering with a mismatched set of question ids", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 2,
    });
    const q1 = await createQuestion(superAdmin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
    await createQuestion(superAdmin, test.id, { order: 2, prompt: "Q2", options: baseOptions(0) });

    await expect(reorderQuestions(superAdmin, test.id, [q1.id])).rejects.toThrow(
      InvalidTestStateError
    );
  });

  it("a question left draft cannot be published once its test is already published (regression: publish must be gated by test state)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 2,
    });
    const q1 = await createQuestion(superAdmin, test.id, { order: 1, prompt: "Q1", options: baseOptions(0) });
    const q2 = await createQuestion(superAdmin, test.id, { order: 2, prompt: "Q2", options: baseOptions(0) });
    await publishQuestion(superAdmin, q1.id);
    await publishPlacementTest(superAdmin, test.id);

    // q2 was never published before the test went live — publishing it now
    // would silently add a question to a test students may already be
    // mid-attempt against, so this must be rejected.
    await expect(publishQuestion(superAdmin, q2.id)).rejects.toThrow(InvalidTestStateError);
  });
});

describe("Phase 2C — placement bands", () => {
  it("Super Admin can create, update, and delete a band", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const band = await createPlacementBand(superAdmin, test.id, {
      order: 0,
      label: "Beginner",
      minPercentage: 0,
      maxPercentage: 50,
    });
    const updated = await updatePlacementBand(superAdmin, band.id, { label: "Renamed" });
    expect(updated.label).toBe("Renamed");

    await deletePlacementBand(superAdmin, band.id);
  });

  it("rejects a band where minPercentage > maxPercentage", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    await expect(
      createPlacementBand(superAdmin, test.id, {
        order: 0,
        label: "Invalid",
        minPercentage: 80,
        maxPercentage: 20,
      })
    ).rejects.toThrow();
  });

  it("Admin can create, update, and delete bands", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "T",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const band = await createPlacementBand(admin, test.id, {
      order: 0,
      label: "Beginner",
      minPercentage: 0,
      maxPercentage: 50,
    });

    const updated = await updatePlacementBand(admin, band.id, { label: "Renamed" });
    expect(updated.label).toBe("Renamed");

    await deletePlacementBand(admin, band.id);
  });
});
