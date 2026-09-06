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
 * P0 regression suite: OFFICIAL placement (`level`) must be derived from
 * TOTAL CORRECT SCORE against the test's configured `PlacementBand`
 * ranges — NEVER from which specific question was answered correctly.
 * Bug this guards against: a candidate who got very few questions right,
 * but one of them happened to be a late/hard question, saw an
 * "Advanced"-sounding result because the (unrelated, question-position-
 * derived) progression signal was being read as if it were the official
 * placement. See /docs/PRODUCT_RULES.md "Scoring & placement" and
 * placement-result.tsx's doc comment.
 *
 * Every band below is a REAL configured fixture (via `createPlacementBand`,
 * the same Super-Admin-only path an admin uses) — never a hard-coded
 * "official" threshold invented for this test. Boundaries are chosen so
 * they land on exact percentages of 70 (the real question count), with no
 * ambiguous overlap: 7/70=10%, 8/70≈11.43%, 21/70=30%, 22/70≈31.43%,
 * 42/70=60%, 43/70≈61.43%, 70/70=100%.
 */

const BAND_SPECS = [
  { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 10 },
  { order: 2, label: "Elementary", minPercentage: 10.01, maxPercentage: 30 },
  { order: 3, label: "Intermediate", minPercentage: 30.01, maxPercentage: 60 },
  { order: 4, label: "Advanced", minPercentage: 60.01, maxPercentage: 100 },
] as const;

beforeEach(async () => {
  await resetDb();
});

/** Answers every question of the (fixed, 1..70-ordered) attempt, marking
 * correct exactly the questions whose 1-based `order` is in `correctOrders`
 * — unlike this test file's neighbors' `answerAll` helpers, this can put
 * the correct answer(s) anywhere in the sequence (e.g. only the LAST
 * question), which is exactly what this suite needs to prove position
 * doesn't affect the official level. */
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
  for (const band of BAND_SPECS) {
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

describe("P0 — official placement level is score-based, never question-position-based", () => {
  it("THE REPORTED BUG: only Q70 (the single hardest, last question) correct -> official level is the 1-correct band (Beginner), never Advanced", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const summary = await runAttempt(superAdmin, test.id, [70]);

    expect(summary.rawScore).toBe(1);
    expect(summary.percentage).toBeCloseTo((1 / 70) * 100, 5);
    expect(summary.level).toBe("Beginner");
    expect(summary.level).not.toBe("Advanced");
    // The question-position-derived diagnostic signal is real and
    // independent — it DOES say "Advanced" here (Q70 falls in the source's
    // Advanced question-range) — proving the bug was real, and that this
    // field must never be read as the official level.
    expect(summary.progression.progressionBand?.label).toBe("Advanced");
  });

  it("4 correct out of 70 (the exact reported scenario, regardless of which questions) -> Beginner", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const summary = await runAttempt(superAdmin, test.id, [1, 2, 3, 70]);

    expect(summary.rawScore).toBe(4);
    expect(summary.level).toBe("Beginner");
  });

  it("0 correct -> Beginner (lower boundary, 0%)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const summary = await runAttempt(superAdmin, test.id, []);

    expect(summary.rawScore).toBe(0);
    expect(summary.percentage).toBe(0);
    expect(summary.level).toBe("Beginner");
  });

  it("1 correct -> Beginner", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const summary = await runAttempt(superAdmin, test.id, [1]);

    expect(summary.rawScore).toBe(1);
    expect(summary.level).toBe("Beginner");
  });

  it("69 correct -> Advanced", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const correctOrders = Array.from({ length: 69 }, (_, i) => i + 1); // 1..69
    const summary = await runAttempt(superAdmin, test.id, correctOrders);

    expect(summary.rawScore).toBe(69);
    expect(summary.level).toBe("Advanced");
  });

  it("70 correct (full score) -> Advanced (upper boundary, 100%)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);

    const correctOrders = Array.from({ length: 70 }, (_, i) => i + 1);
    const summary = await runAttempt(superAdmin, test.id, correctOrders);

    expect(summary.rawScore).toBe(70);
    expect(summary.percentage).toBe(100);
    expect(summary.level).toBe("Advanced");
  });

  // Split into one `it.each` case per boundary (rather than one giant test
  // looping every case) so each gets its own resetDb() via `beforeEach`
  // and its own test timeout, instead of sharing one budget — this
  // environment's real Supabase-pooled connection has meaningful
  // per-request latency (see /docs/PHASE_2D.md "Transaction / timing
  // note"), and a single 70-question end-to-end attempt is already many
  // sequential round trips.
  it.each<[number, string]>([
    [7, "Beginner"], // 10% exactly — Beginner's upper edge
    [8, "Elementary"], // 11.43% — just above Beginner, inside Elementary
    [21, "Elementary"], // 30% exactly — Elementary's upper edge
    [22, "Intermediate"], // 31.43% — just above Elementary, inside Intermediate
    [42, "Intermediate"], // 60% exactly — Intermediate's upper edge
    [43, "Advanced"], // 61.43% — just above Intermediate, inside Advanced
  ])("%i/70 correct should be %s", async (correctCount, expectedLevel) => {
    const sa = await createUser("SUPER_ADMIN");
    const t = await setUpBandedTest(sa);
    const correctOrders = Array.from({ length: correctCount }, (_, i) => i + 1);
    const summary = await runAttempt(sa, t.id, correctOrders);
    expect(summary.level).toBe(expectedLevel);
  });

  it("official level is persisted as a snapshot and matches on every subsequent read (admin detail, assignment summary)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await setUpBandedTest(superAdmin);
    const summary = await runAttempt(superAdmin, test.id, [70]);

    const { getAdminResultDetail, getCanonicalResultSummaryForAssignment } = await import(
      "@/server/services/attempt.service"
    );
    const adminDetail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(adminDetail.level).toBe("Beginner");

    const attempt = await db.placementAttempt.findFirstOrThrow({ where: { id: summary.attemptId } });
    const assignmentSummary = await getCanonicalResultSummaryForAssignment(superAdmin, attempt.assignmentId);
    expect(assignmentSummary!.level).toBe("Beginner");
  });
});
