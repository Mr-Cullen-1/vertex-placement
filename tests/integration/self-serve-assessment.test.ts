import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import { createPlacementTest, publishPlacementTest, setPublicSelfServiceTest } from "@/server/services/placement-test.service";
import { createQuestion, publishQuestion } from "@/server/services/question.service";
import { createPlacementBand } from "@/server/services/placement-band.service";
import {
  getEligibility,
  startPublicAttempt,
  updateSelfServeCandidateProfile,
} from "@/server/services/self-serve.service";
import {
  getAttemptQuestions,
  getAdminResultDetail,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { PublicAttemptLimitReachedError } from "@/server/errors";

const EMAIL = "assessment@example.com";

async function makePublicTestWithBands(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const test = await createPlacementTest(superAdmin, {
    title: "Public Self-Service Fixture",
    durationSeconds: 900,
    totalQuestionCount: 4,
  });
  for (let order = 1; order <= 4; order++) {
    const q = await createQuestion(superAdmin, test.id, {
      order,
      prompt: `Q${order}`,
      options: [
        { text: "A", isCorrect: true, order: 1 },
        { text: "B", isCorrect: false, order: 2 },
        { text: "C", isCorrect: false, order: 3 },
        { text: "D", isCorrect: false, order: 4 },
      ],
    });
    await publishQuestion(superAdmin, q.id);
  }
  await createPlacementBand(superAdmin, test.id, { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 49.99 });
  await createPlacementBand(superAdmin, test.id, { order: 2, label: "Advanced", minPercentage: 50, maxPercentage: 100 });
  const published = await publishPlacementTest(superAdmin, test.id);
  await setPublicSelfServiceTest(superAdmin, published.id);
  return published;
}

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2J — public self-service assessment", () => {
  it("launches the explicitly configured public test, preserves fixed question order, and scores via the real PlacementBand mechanism", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublicTestWithBands(superAdmin);
    await updateSelfServeCandidateProfile(EMAIL, {
      firstName: "Public",
      lastName: "Visitor",
      phoneNumber: "+998900000001",
      age: 19,
    });

    const { token } = await startPublicAttempt(EMAIL);

    const questions = await getAttemptQuestions(token);
    expect(questions.map((q) => q.order)).toEqual([1, 2, 3, 4]);

    // Autosave: answer, then re-read — the selection persists.
    for (const q of questions) {
      const dbQuestion = await db.question.findUniqueOrThrow({
        where: { id: q.questionId },
        include: { options: true },
      });
      const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
      await submitAnswer(token, { questionId: q.questionId, selectedOptionId: correctOptionId });
    }
    const reread = await getAttemptQuestions(token);
    expect(reread.every((q) => q.selectedOptionId !== null)).toBe(true);

    // Timer: server-issued expiresAt matches the configured duration.
    const attempt = await db.placementAttempt.findFirstOrThrow({ where: { assignment: { test: { id: test.id } } } });
    const durationMs = attempt.expiresAt.getTime() - attempt.startedAt.getTime();
    expect(Math.round(durationMs / 1000)).toBe(900);

    const result = await submitAttempt(token);
    expect(result.level).toBe("Advanced"); // 4/4 correct = 100%
    expect(result.rawScore).toBe(4);

    // Result persists — an admin can read the exact same official level.
    const adminDetail = await getAdminResultDetail(superAdmin, attempt.id);
    expect(adminDetail.level).toBe("Advanced");
    expect(adminDetail.candidate.firstName).toBe("Public");
  });

  it("first completion leaves one free attempt remaining; second reaches the limit; a third creation is rejected server-side", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await makePublicTestWithBands(superAdmin);
    await updateSelfServeCandidateProfile(EMAIL, {
      firstName: "Public",
      lastName: "Visitor",
      phoneNumber: "+998900000002",
      age: 20,
    });

    async function completeOne() {
      const { token } = await startPublicAttempt(EMAIL);
      const questions = await getAttemptQuestions(token);
      for (const q of questions) {
        await submitAnswer(token, { questionId: q.questionId, selectedOptionId: q.options[0].id });
      }
      return submitAttempt(token);
    }

    await completeOne();
    expect((await getEligibility(EMAIL)).kind).toBe("ATTEMPT_COMPLETE");

    await completeOne();
    expect((await getEligibility(EMAIL)).kind).toBe("LIMIT_REACHED");

    await expect(startPublicAttempt(EMAIL)).rejects.toThrow(PublicAttemptLimitReachedError);
  });
});
