import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb } from "../setup/db-reset";
import { createAssignmentWithInvitation, createPublishedTestWithQuestions, createUser } from "./fixtures";
import {
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { validateTokenAndLoad } from "@/server/services/invitation.service";
import { generateInvitationToken } from "@/domain/tokens/token";
import { archivePlacementTest } from "@/server/services/placement-test.service";
import { createAssignment } from "@/server/services/assignment.service";
import {
  AttemptExpiredError,
  DuplicateSubmissionError,
  InvitationUsedError,
  TestNotPublishedError,
} from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

describe("attempt creation and resume", () => {
  it("creates a new IN_PROGRESS attempt on first use of a valid token", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const result = await startOrResumeAttempt(invitation.plaintextToken);

    expect(result.status).toBe("IN_PROGRESS");
    if (result.status !== "IN_PROGRESS") throw new Error("unreachable");
    expect(result.totalQuestions).toBe(4);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("resuming the same token returns the same attempt, never a second one", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const first = await startOrResumeAttempt(invitation.plaintextToken);
    const second = await startOrResumeAttempt(invitation.plaintextToken);

    if (first.status !== "IN_PROGRESS" || second.status !== "IN_PROGRESS") {
      throw new Error("unreachable");
    }
    expect(second.attemptId).toBe(first.attemptId);

    const attemptCount = await db.placementAttempt.count({
      where: { invitationId: invitation.invitationId },
    });
    expect(attemptCount).toBe(1);
  });

  it("keeps option display order stable across resume", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const firstView = await getAttemptQuestions(invitation.plaintextToken);
    const secondView = await getAttemptQuestions(invitation.plaintextToken);

    expect(secondView.map((q) => q.options.map((o) => o.id))).toEqual(
      firstView.map((q) => q.options.map((o) => o.id))
    );
  });

  it("never reveals which option is correct in the student-facing view", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const view = await getAttemptQuestions(invitation.plaintextToken);
    for (const question of view) {
      for (const option of question.options) {
        expect(option).not.toHaveProperty("isCorrect");
      }
    }
  });
});

describe("answering and manual submission", () => {
  it("scores a fully-correct submission and returns a level from the configured bands", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test, questions } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    for (const question of questions) {
      const correctOption = question.options.find((o) => o.isCorrect)!;
      await submitAnswer(invitation.plaintextToken, {
        questionId: question.id,
        selectedOptionId: correctOption.id,
      });
    }

    const summary = await submitAttempt(invitation.plaintextToken);

    expect(summary.rawScore).toBe(4);
    expect(summary.totalQuestions).toBe(4);
    expect(summary.percentage).toBe(100);
    expect(summary.level).toBe("Advanced");

    const persisted = await db.placementResult.findUnique({
      where: { attemptId: started.attemptId },
    });
    expect(persisted).not.toBeNull();
    expect(persisted!.rawScore).toBe(4);
  });

  it("treats a changed answer as the final one, not both", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test, questions } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const q1 = questions[0];
    const correct = q1.options.find((o) => o.isCorrect)!;
    const wrong = q1.options.find((o) => !o.isCorrect)!;

    await submitAnswer(invitation.plaintextToken, { questionId: q1.id, selectedOptionId: wrong.id });
    await submitAnswer(invitation.plaintextToken, {
      questionId: q1.id,
      selectedOptionId: correct.id,
    });

    const answers = await db.placementAnswer.findMany({ where: { attemptId: started.attemptId } });
    expect(answers).toHaveLength(1);
    expect(answers[0].selectedOptionId).toBe(correct.id);
  });

  it("marks the invitation USED and rejects reuse after submission", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await submitAttempt(invitation.plaintextToken);

    await expect(startOrResumeAttempt(invitation.plaintextToken)).rejects.toThrow(
      InvitationUsedError
    );
  });

  it("rejects a sequential repeat submission with InvitationUsedError (the token is already spent)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await submitAttempt(invitation.plaintextToken);
    await expect(submitAttempt(invitation.plaintextToken)).rejects.toThrow(InvitationUsedError);
  });

  it("guards a genuine race of two concurrent submits with DuplicateSubmissionError", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const [first, second] = await Promise.allSettled([
      submitAttempt(invitation.plaintextToken),
      submitAttempt(invitation.plaintextToken),
    ]);

    const outcomes = [first, second];
    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    const rejected = outcomes.filter((o) => o.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DuplicateSubmissionError);

    const resultCount = await db.placementResult.count({
      where: { attemptId: started.attemptId },
    });
    expect(resultCount).toBe(1); // scoring/result creation ran exactly once
  });

  it("leaves unanswered questions scored as incorrect rather than failing", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const summary = await submitAttempt(invitation.plaintextToken); // no answers submitted at all
    expect(summary.rawScore).toBe(0);
    expect(summary.percentage).toBe(0);
  });
});

describe("server-authoritative expiration", () => {
  it("auto-submits an IN_PROGRESS attempt discovered past its deadline on next access", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    // Simulate time passing — this is what the server clock would show
    // after the real 30 minutes elapsed; nothing about attempt creation
    // or scoring changes based on how we got here.
    await db.placementAttempt.update({
      where: { id: started.attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const resumed = await startOrResumeAttempt(invitation.plaintextToken);
    expect(resumed.status).toBe("COMPLETED");

    const attempt = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });
    expect(attempt.status).toBe("AUTO_SUBMITTED");

    const inv = await db.placementInvitation.findUniqueOrThrow({
      where: { id: invitation.invitationId },
    });
    expect(inv.status).toBe("USED");
  });

  it("submitAnswer on an expired attempt finalizes it and reports AttemptExpiredError instead of silently accepting the write", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test, questions } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await db.placementAttempt.update({
      where: { id: started.attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(
      submitAnswer(invitation.plaintextToken, {
        questionId: questions[0].id,
        selectedOptionId: questions[0].options[0].id,
      })
    ).rejects.toThrow(AttemptExpiredError);

    const attempt = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });
    expect(attempt.status).toBe("AUTO_SUBMITTED");
  });

  it("a manual submit arriving after the deadline is recorded as AUTO_SUBMITTED, not SUBMITTED", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await db.placementAttempt.update({
      where: { id: started.attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await submitAttempt(invitation.plaintextToken);

    const attempt = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });
    expect(attempt.status).toBe("AUTO_SUBMITTED");
  });
});

describe("canonical result", () => {
  it("the first completed attempt is canonical; a later attempt under the same assignment cannot override it", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { assignment, invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const firstStarted = await startOrResumeAttempt(invitation.plaintextToken);
    if (firstStarted.status !== "IN_PROGRESS") throw new Error("unreachable");
    await submitAttempt(invitation.plaintextToken);

    const firstAttempt = await db.placementAttempt.findUniqueOrThrow({
      where: { id: firstStarted.attemptId },
    });
    expect(firstAttempt.isCanonical).toBe(true);

    // Simulate a future retake at the data level (no retake UI exists in
    // the MVP — see /docs/PRODUCT_RULES.md) to prove the finalize
    // pipeline itself never assumes "latest = canonical". A second,
    // independent, real token/invitation is created directly so the
    // token-based submitAttempt entry point can still be exercised.
    const secondToken = generateInvitationToken();
    const secondInvitation = await db.placementInvitation.create({
      data: {
        assignmentId: assignment.id,
        tokenHash: secondToken.hash,
        status: "ACTIVE",
        createdByUserId: superAdmin.userId,
      },
    });
    const secondAttempt = await db.placementAttempt.create({
      data: {
        assignmentId: assignment.id,
        invitationId: secondInvitation.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        optionOrder: {},
      },
    });

    await submitAttempt(secondToken.plaintext);

    const secondAfterSubmit = await db.placementAttempt.findUniqueOrThrow({
      where: { id: secondAttempt.id },
    });
    const firstAfterSecondSubmit = await db.placementAttempt.findUniqueOrThrow({
      where: { id: firstStarted.attemptId },
    });

    expect(secondAfterSubmit.isCanonical).toBe(false);
    expect(firstAfterSecondSubmit.isCanonical).toBe(true);
  });
});

describe("archiving a test", () => {
  it("blocks new assignments but does not interrupt an attempt already in progress", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await archivePlacementTest(superAdmin, test.id);

    // Blocked: starting a brand-new assignment against an archived test.
    await expect(
      createAssignment(superAdmin, {
        testId: test.id,
        candidate: { firstName: "X", lastName: "Y", phoneNumber: "+998900000099", age: 30 },
      })
    ).rejects.toThrow(TestNotPublishedError);

    // Not blocked: the candidate already mid-test can resume, answer, and submit.
    const resumed = await startOrResumeAttempt(invitation.plaintextToken);
    expect(resumed.status).toBe("IN_PROGRESS");

    const questions = await getAttemptQuestions(invitation.plaintextToken);
    await submitAnswer(invitation.plaintextToken, {
      questionId: questions[0].questionId,
      selectedOptionId: questions[0].options[0].id,
    });
    const summary = await submitAttempt(invitation.plaintextToken);
    expect(summary.totalQuestions).toBe(4);
  });
});

describe("token validation edge cases", () => {
  it("rejects a token that does not exist at all", async () => {
    await expect(validateTokenAndLoad("not-a-real-token")).rejects.toThrow();
  });
});
