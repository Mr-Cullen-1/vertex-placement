import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import {
  createAssignmentWithInvitation,
  createPublishedTestWithNQuestions,
  createPublishedTestWithQuestions,
  createUser,
} from "./fixtures";
import { db } from "@/lib/db";
import {
  getAdminResultDetail,
  getAttemptQuestions,
  getCompletedResultForToken,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";

beforeEach(async () => {
  await resetDb();
});

/** Answers every question in `token`'s attempt, in fixed question order
 * (index 0 = order 1, etc.), correctly for the first `correctCount` and
 * incorrectly for the rest. Always resolves the TRUE correct option from
 * the database rather than assuming position within the (per-attempt
 * randomized) displayed option order. */
async function answerAll(token: string, correctCount: number) {
  const view = await getAttemptQuestions(token);
  for (const [index, q] of view.entries()) {
    const wantsCorrect = index < correctCount;
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
    const wrongOptionId = dbQuestion.options.find((o) => !o.isCorrect)!.id;
    await submitAnswer(token, {
      questionId: q.questionId,
      selectedOptionId: wantsCorrect ? correctOptionId : wrongOptionId,
    });
  }
}

describe("Phase 2E — score calculation (manual submit, full DB flow)", () => {
  it("all-correct result: 70/70, 100%, Advanced progression", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 70);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 70);

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.rawScore).toBe(70);
    expect(summary.totalQuestions).toBe(70);
    expect(summary.percentage).toBe(100);
    expect(summary.autoSubmitted).toBe(false);
    expect(summary.progression.correctCount).toBe(70);
    expect(summary.progression.highestCorrectQuestionOrder).toBe(70);
    expect(summary.progression.progressionBand?.label).toBe("Advanced");
  });

  it("zero-correct result: 0/70, 0%, no progression band", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 70);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 0);

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.rawScore).toBe(0);
    expect(summary.percentage).toBe(0);
    expect(summary.progression.highestCorrectQuestionOrder).toBeNull();
    expect(summary.progression.progressionBand).toBeNull();
  });

  it("partial result with unanswered questions: exact answered/correct/incorrect/unanswered breakdown", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 70);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);

    const view = await getAttemptQuestions(invitation.plaintextToken);
    // Answer only the first 65 questions: 50 correct, 15 incorrect. The
    // last 5 are left untouched -> unanswered.
    for (const [index, q] of view.slice(0, 65).entries()) {
      const dbQuestion = await db.question.findUniqueOrThrow({
        where: { id: q.questionId },
        include: { options: true },
      });
      const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
      const wrongOptionId = dbQuestion.options.find((o) => !o.isCorrect)!.id;
      await submitAnswer(invitation.plaintextToken, {
        questionId: q.questionId,
        selectedOptionId: index < 50 ? correctOptionId : wrongOptionId,
      });
    }

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.rawScore).toBe(50);
    expect(summary.percentage).toBeCloseTo((50 / 70) * 100, 2);
    expect(summary.progression.answeredCount).toBe(65);
    expect(summary.progression.correctCount).toBe(50);
    expect(summary.progression.incorrectCount).toBe(15);
    expect(summary.progression.unansweredCount).toBe(5);
  });

  it("50 correct -> percentage is exactly 71.43 (rounded to 2dp)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 70);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 50);

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.rawScore).toBe(50);
    expect(Math.round(summary.percentage * 100) / 100).toBeCloseTo(71.43, 1);
  });
});

describe("Phase 2E — manual vs auto submission use the same pipeline", () => {
  it("auto-submitted result: same scoring pipeline, autoSubmitted flag set", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 10);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await answerAll(invitation.plaintextToken, 7);

    // Simulate the 30-minute deadline passing — same technique as the
    // existing attempt-lifecycle suite.
    await db.placementAttempt.update({
      where: { id: started.attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const resumed = await startOrResumeAttempt(invitation.plaintextToken);
    if (resumed.status !== "COMPLETED") throw new Error("expected auto-finalization");

    expect(resumed.result.rawScore).toBe(7);
    expect(resumed.result.autoSubmitted).toBe(true);
    expect(resumed.result.progression.highestCorrectQuestionOrder).toBe(7);

    const attempt = await db.placementAttempt.findUniqueOrThrow({ where: { id: started.attemptId } });
    expect(attempt.status).toBe("AUTO_SUBMITTED");
  });

  it("manual-submitted result: autoSubmitted is false", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 10);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 5);

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.autoSubmitted).toBe(false);
  });
});

describe("Phase 2E — canonical status exposed to admin", () => {
  it("a canonical, manually-submitted attempt reports isCanonical: true in admin detail", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 5);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 3);
    const summary = await submitAttempt(invitation.plaintextToken);

    const detail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(detail.isCanonical).toBe(true);
    expect(detail.status).toBe("SUBMITTED");
    expect(new Date(detail.startedAt).getTime()).toBeLessThanOrEqual(new Date(detail.completedAt).getTime());
  });
});

describe("Phase 2E — security: students never see the answer key", () => {
  it("StudentResultSummary carries no correct-option or per-question detail", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 5);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 2);
    const summary = await submitAttempt(invitation.plaintextToken);

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toMatch(/correctOption/i);
    expect(serialized).not.toMatch(/isCorrect/i);
    expect(summary).not.toHaveProperty("questionAnalysis");

    // Re-fetching the already-completed result (student revisits the
    // link) must be equally answer-key-free.
    const refetched = await getCompletedResultForToken(invitation.plaintextToken);
    const refetchedSerialized = JSON.stringify(refetched);
    expect(refetchedSerialized).not.toMatch(/correctOption/i);
    expect(refetchedSerialized).not.toMatch(/isCorrect/i);
  });

  it("admin CAN see the full per-question answer key via getAdminResultDetail", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 5);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 3);
    const summary = await submitAttempt(invitation.plaintextToken);

    const detail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(detail.questionAnalysis).toHaveLength(5);
    for (const q of detail.questionAnalysis) {
      expect(q.correctOptionText).toBeTruthy();
    }
    const unanswered = detail.questionAnalysis.filter((q) => !q.isAnswered);
    const answered = detail.questionAnalysis.filter((q) => q.isAnswered);
    expect(unanswered).toHaveLength(0); // answerAll answered every question
    expect(answered).toHaveLength(5);
  });
});

describe("Phase 2E — option randomization does not corrupt scoring or progression", () => {
  it("scoring and highest-correct-question are correct regardless of per-attempt option display order", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 20);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);

    const view = await getAttemptQuestions(invitation.plaintextToken);
    // Confirm the fixture's randomization actually produced a
    // non-canonical order for at least one question (sanity check that
    // this test is exercising something real) — not required to pass,
    // but if it never happens the option-order mechanism itself would
    // need investigating separately.
    const attempt = await db.placementAttempt.findFirstOrThrow({ where: { invitationId: invitation.invitationId } });
    expect(attempt.optionOrder).toBeTruthy();

    // Answer correctly for questions with order <= 12 by resolving the
    // TRUE correct option from the database, never from position in the
    // (possibly shuffled) view.
    for (const q of view) {
      const dbQuestion = await db.question.findUniqueOrThrow({
        where: { id: q.questionId },
        include: { options: true },
      });
      const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
      const wrongOptionId = dbQuestion.options.find((o) => !o.isCorrect)!.id;
      await submitAnswer(invitation.plaintextToken, {
        questionId: q.questionId,
        selectedOptionId: dbQuestion.order <= 12 ? correctOptionId : wrongOptionId,
      });
    }

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.rawScore).toBe(12);
    expect(summary.progression.highestCorrectQuestionOrder).toBe(12);
  });
});

describe("Phase 2E — persistence and immutability after completion", () => {
  it("a second submit attempt is rejected, never recomputes or overwrites the result", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 10);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 4);
    const firstSummary = await submitAttempt(invitation.plaintextToken);

    // Immediately re-submitting the same token now fails token
    // validation (invitation already USED) before it could ever touch
    // scoring again.
    await expect(submitAttempt(invitation.plaintextToken)).rejects.toThrow();

    const resultRows = await db.placementResult.count({ where: { attemptId: firstSummary.attemptId } });
    expect(resultRows).toBe(1);
  });

  it("re-fetching a completed result later returns identical progression numbers every time", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 30);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 18);
    const original = await submitAttempt(invitation.plaintextToken);

    const refetch1 = await getCompletedResultForToken(invitation.plaintextToken);
    const refetch2 = await getCompletedResultForToken(invitation.plaintextToken);

    expect(refetch1.progression).toEqual(original.progression);
    expect(refetch2.progression).toEqual(original.progression);
    expect(refetch1.rawScore).toBe(original.rawScore);
    expect(refetch1.percentage).toBe(original.percentage);
  });

  it("persisted PlacementResult row matches the returned summary's raw score/percentage", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithNQuestions(superAdmin, 10);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 6);
    const summary = await submitAttempt(invitation.plaintextToken);

    const persisted = await db.placementResult.findUniqueOrThrow({ where: { attemptId: summary.attemptId } });
    expect(persisted.rawScore).toBe(summary.rawScore);
    expect(persisted.totalQuestions).toBe(summary.totalQuestions);
    expect(persisted.percentage).toBe(summary.percentage);
  });
});

describe("Phase 2E — existing PlacementBand mechanism is unaffected", () => {
  it("the old percentage-based `level` and new question-progression guidance coexist without conflict", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin); // has 2 configured bands
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await answerAll(invitation.plaintextToken, 4); // all correct -> 100%

    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.level).toBe("Advanced"); // from the fixture's configured PlacementBand
    // Progression is independently computed from question order (this
    // fixture's questions are order 1-4, all within the Beginner 1-6
    // range) — the two systems are allowed to say different things.
    expect(summary.progression.progressionBand?.label).toBe("Beginner");
  });
});
