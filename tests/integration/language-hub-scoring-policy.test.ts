import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createAssignmentWithInvitation, createPublishedTestWithQuestions, createUser } from "./fixtures";
import { db } from "@/lib/db";
import { createPlacementTest, publishPlacementTest } from "@/server/services/placement-test.service";
import { createQuestion, publishQuestion } from "@/server/services/question.service";
import {
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import {
  applyLanguageHubInstitutionalBands,
  LANGUAGE_HUB_INSTITUTIONAL_BANDS,
  LANGUAGE_HUB_TEST_TITLE,
} from "@/server/services/language-hub-scoring.service";

/**
 * Phase 2L — /docs/PHASE_2L_SCORING_POLICY.md ("Historical results
 * backfill"). Verifies `applyLanguageHubInstitutionalBands`: idempotent,
 * only ever touches the ONE test titled exactly
 * "Language Hub Placement Test", and only ever fills a previously-null
 * `placementBandId` — never rawScore/percentage/answers/timestamps.
 */

beforeEach(async () => {
  await resetDb();
});

/** A 70-question test titled exactly like the real Language Hub test —
 * the ONLY thing `applyLanguageHubInstitutionalBands` looks for. Built
 * directly (not via createPublishedTestWithNQuestions, which uses a
 * different title) specifically to exercise that exact-title lookup. */
async function createLanguageHubShapedTest(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const test = await createPlacementTest(superAdmin, {
    title: LANGUAGE_HUB_TEST_TITLE,
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
  return publishPlacementTest(superAdmin, test.id);
}

async function runAttemptWithNCorrect(
  superAdmin: Awaited<ReturnType<typeof createUser>>,
  testId: string,
  correctCount: number
) {
  const { invitation } = await createAssignmentWithInvitation(superAdmin, testId);
  await startOrResumeAttempt(invitation.plaintextToken);
  const view = await getAttemptQuestions(invitation.plaintextToken);
  for (const q of view) {
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const wantCorrect = q.order <= correctCount;
    const optionId = wantCorrect
      ? dbQuestion.options.find((o) => o.isCorrect)!.id
      : dbQuestion.options.find((o) => !o.isCorrect)!.id;
    await submitAnswer(invitation.plaintextToken, { questionId: q.questionId, selectedOptionId: optionId });
  }
  return submitAttempt(invitation.plaintextToken);
}

describe("applyLanguageHubInstitutionalBands", () => {
  it("creates the six approved bands when none exist, and is a no-op the second time", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await createLanguageHubShapedTest(superAdmin);

    const first = await applyLanguageHubInstitutionalBands(superAdmin);
    expect(first.bandsCreated).toBe(6);

    const bands = await db.placementBand.findMany({
      where: { test: { title: LANGUAGE_HUB_TEST_TITLE } },
      orderBy: { order: "asc" },
    });
    expect(bands).toHaveLength(6);
    expect(bands.every((b) => b.scoringMode === "RAW_SCORE")).toBe(true);
    expect(bands.map((b) => [b.label, b.minRawScore, b.maxRawScore])).toEqual(
      LANGUAGE_HUB_INSTITUTIONAL_BANDS.map((b) => [b.label, b.minRawScore, b.maxRawScore])
    );

    const second = await applyLanguageHubInstitutionalBands(superAdmin);
    expect(second.bandsCreated).toBe(0);
    const bandsAfterSecondRun = await db.placementBand.count({
      where: { test: { title: LANGUAGE_HUB_TEST_TITLE } },
    });
    expect(bandsAfterSecondRun).toBe(6);
  });

  it("the historical 4/70 case backfills to Beginner, never Advanced — never touches rawScore/percentage/timestamps", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createLanguageHubShapedTest(superAdmin);

    // Complete an attempt BEFORE any bands exist — placementBandId stays
    // null, exactly like the real historical 4/70 result.
    const summary = await runAttemptWithNCorrect(superAdmin, test.id, 4);
    expect(summary.level).toBeNull();

    const before = await db.placementResult.findFirstOrThrow({ where: { attemptId: summary.attemptId } });
    expect(before.placementBandId).toBeNull();
    expect(before.rawScore).toBe(4);

    const applied = await applyLanguageHubInstitutionalBands(superAdmin);
    expect(applied.resultsBackfilled).toBe(1);

    const after = await db.placementResult.findFirstOrThrow({
      where: { attemptId: summary.attemptId },
      include: { placementBand: true },
    });
    expect(after.placementBand?.label).toBe("Beginner");
    expect(after.placementBand?.label).not.toBe("Advanced");
    // Nothing else about the persisted result changed.
    expect(after.rawScore).toBe(before.rawScore);
    expect(after.percentage).toBe(before.percentage);
    expect(after.completionSeconds).toBe(before.completionSeconds);
    expect(after.computedAt).toEqual(before.computedAt);
  });

  it("is idempotent for the backfill too — re-running after a successful backfill updates zero additional results", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await createLanguageHubShapedTest(superAdmin);
    await runAttemptWithNCorrect(superAdmin, test.id, 27);

    const first = await applyLanguageHubInstitutionalBands(superAdmin);
    expect(first.resultsBackfilled).toBe(1);

    const second = await applyLanguageHubInstitutionalBands(superAdmin);
    expect(second.resultsBackfilled).toBe(0);
  });

  it("never applies Language Hub bands or touches results on an unrelated test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test: otherTest } = await createPublishedTestWithQuestions(superAdmin);
    const otherSummary = await runAttemptWithNCorrect(superAdmin, otherTest.id, 4);
    const otherBefore = await db.placementResult.findFirstOrThrow({
      where: { attemptId: otherSummary.attemptId },
    });

    await createLanguageHubShapedTest(superAdmin);
    await applyLanguageHubInstitutionalBands(superAdmin);

    const otherBandsCount = await db.placementBand.count({ where: { testId: otherTest.id } });
    // The unrelated fixture test already has its own 2 PERCENTAGE bands
    // (from createPublishedTestWithQuestions) — must be exactly unchanged.
    expect(otherBandsCount).toBe(2);
    expect(
      (await db.placementBand.findMany({ where: { testId: otherTest.id } })).every(
        (b) => b.scoringMode === "PERCENTAGE"
      )
    ).toBe(true);

    const otherAfter = await db.placementResult.findFirstOrThrow({
      where: { attemptId: otherSummary.attemptId },
    });
    expect(otherAfter.placementBandId).toBe(otherBefore.placementBandId);
  });

  it("throws if the real Language Hub test doesn't exist yet", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await expect(applyLanguageHubInstitutionalBands(superAdmin)).rejects.toThrow();
  });
});
