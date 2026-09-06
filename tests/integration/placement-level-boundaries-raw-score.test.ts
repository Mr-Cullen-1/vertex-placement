import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createAssignmentWithInvitation, createPublishedTestWithNQuestions, createUser } from "./fixtures";
import { db } from "@/lib/db";
import { createPlacementBand } from "@/server/services/placement-band.service";
import {
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";

/**
 * Phase 2L — P0 regression suite for the RAW_SCORE scoring mode: the
 * approved Vertex institutional bands for the real Language Hub test
 * (0-6 Beginner, 7-17 Elementary, 18-34 Pre-Intermediate, 35-48
 * Intermediate, 49-60 Upper Intermediate, 61-70 Advanced — see
 * /docs/PHASE_2L_SCORING_POLICY.md), matched against TOTAL CORRECT
 * ANSWERS directly, never a percentage conversion. Sibling to
 * placement-level-boundaries.test.ts (which covers the older PERCENTAGE
 * mode) — kept as a separate file since the two modes must never be
 * conflated, and this file's fixture uses the exact approved band values
 * rather than illustrative round percentages.
 */

const VERTEX_INSTITUTIONAL_BANDS = [
  { order: 1, label: "Beginner", scoringMode: "RAW_SCORE" as const, minRawScore: 0, maxRawScore: 6 },
  { order: 2, label: "Elementary", scoringMode: "RAW_SCORE" as const, minRawScore: 7, maxRawScore: 17 },
  { order: 3, label: "Pre-Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 18, maxRawScore: 34 },
  { order: 4, label: "Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 35, maxRawScore: 48 },
  { order: 5, label: "Upper Intermediate", scoringMode: "RAW_SCORE" as const, minRawScore: 49, maxRawScore: 60 },
  { order: 6, label: "Advanced", scoringMode: "RAW_SCORE" as const, minRawScore: 61, maxRawScore: 70 },
];

beforeEach(async () => {
  await resetDb();
});

async function answerOnlyOrders(token: string, correctOrders: readonly number[]) {
  const view = await getAttemptQuestions(token);
  const wanted = new Set(correctOrders);
  for (const q of view) {
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const wantCorrect = wanted.has(q.order);
    const optionId = wantCorrect
      ? dbQuestion.options.find((o) => o.isCorrect)!.id
      : dbQuestion.options.find((o) => !o.isCorrect)!.id;
    await submitAnswer(token, { questionId: q.questionId, selectedOptionId: optionId });
  }
}

async function setUpBandedTest(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const { test } = await createPublishedTestWithNQuestions(superAdmin, 70);
  for (const band of VERTEX_INSTITUTIONAL_BANDS) {
    await createPlacementBand(superAdmin, test.id, band);
  }
  return test;
}

async function runAttempt(superAdmin: Awaited<ReturnType<typeof createUser>>, testId: string, correctOrders: readonly number[]) {
  const { invitation } = await createAssignmentWithInvitation(superAdmin, testId);
  await startOrResumeAttempt(invitation.plaintextToken);
  await answerOnlyOrders(invitation.plaintextToken, correctOrders);
  return submitAttempt(invitation.plaintextToken);
}

describe("P0 — RAW_SCORE placement bands (Vertex institutional policy)", () => {
  // Split into one `it.each` case per boundary (rather than one giant test
  // looping 13 full 70-question attempts) — each case gets its own
  // resetDb() via the file's `beforeEach` and its own test timeout,
  // instead of sharing one budget across every case. Together these
  // values also cover every band TRANSITION required by section 17
  // (6/7, 17/18, 34/35, 48/49, 60/61 all appear as adjacent pairs below).
  it.each<[number, string]>([
    [0, "Beginner"],
    [6, "Beginner"],
    [7, "Elementary"],
    [17, "Elementary"],
    [18, "Pre-Intermediate"],
    [27, "Pre-Intermediate"],
    [34, "Pre-Intermediate"],
    [35, "Intermediate"],
    [48, "Intermediate"],
    [49, "Upper Intermediate"],
    [60, "Upper Intermediate"],
    [61, "Advanced"],
    [70, "Advanced"],
  ])("%i/70 correct -> %s", async (correctCount, expectedLevel) => {
    const sa = await createUser("SUPER_ADMIN");
    const t = await setUpBandedTest(sa);
    const correctOrders = Array.from({ length: correctCount }, (_, i) => i + 1);
    const summary = await runAttempt(sa, t.id, correctOrders);
    expect(summary.rawScore).toBe(correctCount);
    expect(summary.level).toBe(expectedLevel);
  });

  it("QUESTION IDENTITY REGRESSION, candidate A: 4 correct including Q70 -> Beginner (never Advanced)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const candidateA = await runAttempt(superAdmin, test.id, [1, 2, 3, 70]);
    expect(candidateA.rawScore).toBe(4);
    expect(candidateA.level).toBe("Beginner");
    expect(candidateA.level).not.toBe("Advanced");
    // The diagnostic course-level breakdown DOES reflect the Advanced-range
    // correct answer — proving this is a real, meaningfully-different
    // diagnostic signal, while the official Recommended Level (asserted
    // identical to candidate B, below) is not swayed by it.
    const advancedRowA = candidateA.detailedAnalysis.courseLevelPerformance.find(
      (e) => e.label === "Advanced"
    );
    expect(advancedRowA?.correct).toBe(1);
  });

  it("QUESTION IDENTITY REGRESSION, candidate B: 4 correct only among Q1-6 -> Beginner (same as candidate A)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const candidateB = await runAttempt(superAdmin, test.id, [1, 2, 3, 4]);
    expect(candidateB.rawScore).toBe(4);
    expect(candidateB.level).toBe("Beginner");
    const advancedRowB = candidateB.detailedAnalysis.courseLevelPerformance.find(
      (e) => e.label === "Advanced"
    );
    expect(advancedRowB?.correct).toBe(0);
  });

  it("official level is persisted and matches on every subsequent read (admin detail, assignment summary)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);
    const summary = await runAttempt(superAdmin, test.id, [70]);
    expect(summary.rawScore).toBe(1);
    expect(summary.level).toBe("Beginner");

    const { getAdminResultDetail, getCanonicalResultSummaryForAssignment } = await import(
      "@/server/services/attempt.service"
    );
    const adminDetail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(adminDetail.level).toBe("Beginner");
    expect(adminDetail.finalPlacement.label).toBe("Beginner");
    expect(adminDetail.finalPlacement.isOverridden).toBe(false);

    const attempt = await db.placementAttempt.findFirstOrThrow({ where: { id: summary.attemptId } });
    const assignmentSummary = await getCanonicalResultSummaryForAssignment(superAdmin, attempt.assignmentId);
    expect(assignmentSummary!.level).toBe("Beginner");
  });
});
