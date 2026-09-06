import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createAssignmentWithInvitation, createPublishedTestWithQuestions, createUser } from "./fixtures";
import { db } from "@/lib/db";
import {
  getAdminResultDetail,
  getAttemptQuestions,
  setFinalPlacement,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { InvalidPlacementLevelError } from "@/server/errors";

/**
 * Phase 2L — Final Placement: an administrative decision, deliberately
 * separate from `level` (Recommended Level). See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Final Placement").
 */

beforeEach(async () => {
  await resetDb();
});

async function completeAnAttempt(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const { test } = await createPublishedTestWithQuestions(superAdmin);
  const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
  await startOrResumeAttempt(invitation.plaintextToken);
  const questions = await getAttemptQuestions(invitation.plaintextToken);
  for (const q of questions) {
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const correct = dbQuestion.options.find((o) => o.isCorrect)!.id;
    await submitAnswer(invitation.plaintextToken, { questionId: q.questionId, selectedOptionId: correct });
  }
  return submitAttempt(invitation.plaintextToken);
}

describe("setFinalPlacement", () => {
  it("defaults to the Recommended Level (no override) before any admin action", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const summary = await completeAnAttempt(superAdmin);

    const detail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(detail.finalPlacement.isOverridden).toBe(false);
    expect(detail.finalPlacement.label).toBe(detail.level);
    expect(detail.finalPlacement.setByName).toBeNull();
    expect(detail.finalPlacement.setAt).toBeNull();
  });

  it("an override never mutates rawScore, percentage, or the Recommended Level", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const summary = await completeAnAttempt(superAdmin);
    const before = await getAdminResultDetail(superAdmin, summary.attemptId);

    await setFinalPlacement(superAdmin, summary.attemptId, "Upper Intermediate");

    const after = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(after.rawScore).toBe(before.rawScore);
    expect(after.percentage).toBe(before.percentage);
    expect(after.level).toBe(before.level); // Recommended Level unchanged
    expect(after.finalPlacement.label).toBe("Upper Intermediate");
    expect(after.finalPlacement.isOverridden).toBe(true);
    expect(after.finalPlacement.setByName).toEqual(expect.any(String));
  });

  it("records who overrode it and when", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const summary = await completeAnAttempt(superAdmin);

    await setFinalPlacement(superAdmin, summary.attemptId, "Advanced");

    const result = await db.placementResult.findFirstOrThrow({
      where: { attemptId: summary.attemptId },
      include: { finalPlacementSetBy: true },
    });
    expect(result.finalPlacementLabel).toBe("Advanced");
    expect(result.finalPlacementSetByUserId).toBe(superAdmin.userId);
    expect(result.finalPlacementSetBy?.id).toBe(superAdmin.userId);
    expect(result.finalPlacementSetAt).not.toBeNull();
  });

  it("clearing the override (label: null) reverts display to the Recommended Level and marks isOverridden false", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const summary = await completeAnAttempt(superAdmin);
    await setFinalPlacement(superAdmin, summary.attemptId, "Beginner");

    await setFinalPlacement(superAdmin, summary.attemptId, null);

    const detail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(detail.finalPlacement.isOverridden).toBe(false);
    expect(detail.finalPlacement.label).toBe(detail.level);
    expect(detail.finalPlacement.setByName).toBeNull();
    expect(detail.finalPlacement.setAt).toBeNull();
  });

  it("rejects a label that isn't one of the six standard Vertex placement levels", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const summary = await completeAnAttempt(superAdmin);

    await expect(setFinalPlacement(superAdmin, summary.attemptId, "Super Genius")).rejects.toThrow(
      InvalidPlacementLevelError
    );
  });

  it("both ADMIN and SUPER_ADMIN may set Final Placement", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const summary = await completeAnAttempt(superAdmin);

    await expect(setFinalPlacement(admin, summary.attemptId, "Intermediate")).resolves.toBeUndefined();
    const detail = await getAdminResultDetail(admin, summary.attemptId);
    expect(detail.finalPlacement.label).toBe("Intermediate");
  });
});
