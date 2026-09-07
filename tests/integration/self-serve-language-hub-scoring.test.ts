import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import {
  createPlacementTest,
  publishPlacementTest,
  setPublicSelfServiceTest,
} from "@/server/services/placement-test.service";
import { createQuestion, publishQuestion } from "@/server/services/question.service";
import { createPlacementBand } from "@/server/services/placement-band.service";
import { startPublicAttempt, updateSelfServeCandidateProfile } from "@/server/services/self-serve.service";
import { getAttemptQuestions, submitAnswer, submitAttempt } from "@/server/services/attempt.service";

/**
 * Phase 2L, item 19 — Try Yourself must use exactly the same canonical
 * resolver as the admin-assigned flow, including for RAW_SCORE bands. No
 * parallel Try Yourself scoring implementation should exist. See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Try Yourself").
 */

beforeEach(async () => {
  await resetDb();
});

async function createPublicLanguageHubShapedTest(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const test = await createPlacementTest(superAdmin, {
    title: "Public Language-Hub-Shaped Fixture",
    durationSeconds: 1800,
    totalQuestionCount: 70,
  });
  for (let order = 1; order <= 70; order++) {
    const q = await createQuestion(superAdmin, test.id, {
      order,
      prompt: `Q${order}`,
      options: [
        { text: "A", isCorrect: true, order: 1 },
        { text: "B", isCorrect: false, order: 2 },
      ],
    });
    await publishQuestion(superAdmin, q.id);
  }
  const VERTEX_BANDS = [
    { order: 1, label: "Beginner", scoringMode: "RAW_SCORE" as const, minRawScore: 0, maxRawScore: 6 },
    { order: 2, label: "Elementary", scoringMode: "RAW_SCORE" as const, minRawScore: 7, maxRawScore: 17 },
    { order: 3, label: "Pre-Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 18, maxRawScore: 34 },
    { order: 4, label: "Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 35, maxRawScore: 48 },
    { order: 5, label: "Upper Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 49, maxRawScore: 60 },
    { order: 6, label: "Advanced", scoringMode: "RAW_SCORE" as const, minRawScore: 61, maxRawScore: 70 },
  ];
  for (const band of VERTEX_BANDS) {
    await createPlacementBand(superAdmin, test.id, band);
  }
  const published = await publishPlacementTest(superAdmin, test.id);
  await setPublicSelfServiceTest(superAdmin, published.id);
  return published;
}

async function runPublicAttemptWithNCorrect(email: string, correctCount: number) {
  await updateSelfServeCandidateProfile(email, {
    firstName: "Public",
    lastName: "Visitor",
    phoneNumber: "+998900000001",
    age: 20,
  });
  const { token } = await startPublicAttempt(email);
  const view = await getAttemptQuestions(token);
  for (const q of view) {
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const wantCorrect = q.order <= correctCount;
    const optionId = wantCorrect
      ? dbQuestion.options.find((o) => o.isCorrect)!.id
      : dbQuestion.options.find((o) => !o.isCorrect)!.id;
    await submitAnswer(token, { questionId: q.questionId, selectedOptionId: optionId });
  }
  return submitAttempt(token);
}

describe("Try Yourself uses the exact same canonical RAW_SCORE resolver", () => {
  it("4/70 -> Beginner", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createPublicLanguageHubShapedTest(superAdmin);
    const result = await runPublicAttemptWithNCorrect("student-4@example.com", 4);
    expect(result.rawScore).toBe(4);
    expect(result.level).toBe("Beginner");
  });

  it("18/70 -> Pre-Intermediate", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createPublicLanguageHubShapedTest(superAdmin);
    const result = await runPublicAttemptWithNCorrect("student-18@example.com", 18);
    expect(result.rawScore).toBe(18);
    expect(result.level).toBe("Pre-Intermediate");
  });

  it("27/70 -> Pre-Intermediate", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createPublicLanguageHubShapedTest(superAdmin);
    const result = await runPublicAttemptWithNCorrect("student-27@example.com", 27);
    expect(result.rawScore).toBe(27);
    expect(result.level).toBe("Pre-Intermediate");
  });

  it("61/70 -> Advanced", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createPublicLanguageHubShapedTest(superAdmin);
    const result = await runPublicAttemptWithNCorrect("student-61@example.com", 61);
    expect(result.rawScore).toBe(61);
    expect(result.level).toBe("Advanced");
  });

  it("admin detail for the same self-service attempt reports the identical Recommended Level (one shared resolver)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createPublicLanguageHubShapedTest(superAdmin);
    const result = await runPublicAttemptWithNCorrect("student-consistency@example.com", 27);

    const { getAdminResultDetail } = await import("@/server/services/attempt.service");
    const adminDetail = await getAdminResultDetail(superAdmin, result.attemptId);
    expect(adminDetail.level).toBe("Pre-Intermediate");
    expect(adminDetail.level).toBe(result.level);
    // Try Yourself candidates never get a Final Placement override surface
    // on their own result — but the admin view still carries the field,
    // defaulted to the Recommended Level, same as any other attempt.
    expect(adminDetail.finalPlacement.isOverridden).toBe(false);
  });
});
