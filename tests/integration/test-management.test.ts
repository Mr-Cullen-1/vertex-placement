import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import {
  createPlacementTest,
  publishPlacementTest,
  updatePlacementTest,
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
import { ForbiddenError, InvalidTestStateError } from "@/server/errors";

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

  it("Admin cannot create a test", async () => {
    const admin = await createUser("ADMIN");
    await expect(
      createPlacementTest(admin, { title: "Nope", durationSeconds: 1800, totalQuestionCount: 1 })
    ).rejects.toThrow(ForbiddenError);
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

  it("Admin cannot publish a test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "Empty",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    await expect(publishPlacementTest(admin, test.id)).rejects.toThrow(ForbiddenError);
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

  it("Admin cannot create, edit, delete, or reorder questions", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
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

    await expect(
      createQuestion(admin, test.id, { order: 2, prompt: "Injected", options: baseOptions(0) })
    ).rejects.toThrow(ForbiddenError);
    await expect(updateQuestion(admin, question.id, { prompt: "Hijack" })).rejects.toThrow(
      ForbiddenError
    );
    await expect(deleteQuestion(admin, question.id)).rejects.toThrow(ForbiddenError);
    await expect(reorderQuestions(admin, test.id, [question.id])).rejects.toThrow(ForbiddenError);
    await expect(publishQuestion(admin, question.id)).rejects.toThrow(ForbiddenError);
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

  it("Admin cannot create, update, or delete bands", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
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

    await expect(
      createPlacementBand(admin, test.id, { order: 1, label: "X", minPercentage: 0, maxPercentage: 100 })
    ).rejects.toThrow(ForbiddenError);
    await expect(updatePlacementBand(admin, band.id, { label: "Hijack" })).rejects.toThrow(
      ForbiddenError
    );
    await expect(deletePlacementBand(admin, band.id)).rejects.toThrow(ForbiddenError);
  });
});
