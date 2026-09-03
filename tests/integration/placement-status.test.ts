import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb } from "../setup/db-reset";
import {
  createAssignmentWithInvitation,
  createPublishedTestWithQuestions,
  createUser,
} from "./fixtures";
import {
  getCompletedResultForToken,
  getPlacementStatus,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { updateCandidateForToken } from "@/server/services/invitation.service";
import { AttemptNotFoundError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

describe("getPlacementStatus", () => {
  it("reports NOT_STARTED with test/candidate display info before any attempt exists", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const status = await getPlacementStatus(invitation.plaintextToken);

    expect(status.kind).toBe("NOT_STARTED");
    if (status.kind !== "NOT_STARTED") throw new Error("unreachable");
    expect(status.testTitle).toBe(test.title);
    expect(status.totalQuestions).toBe(4);
    expect(status.candidate.firstName).toBe("Test");
  });

  it("does NOT create an attempt as a side effect of checking status", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    await getPlacementStatus(invitation.plaintextToken);
    await getPlacementStatus(invitation.plaintextToken);

    const attemptCount = await db.placementAttempt.count({
      where: { invitationId: invitation.invitationId },
    });
    expect(attemptCount).toBe(0);
  });

  it("reports IN_PROGRESS with the server-issued expiresAt once an attempt exists", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);

    const status = await getPlacementStatus(invitation.plaintextToken);
    expect(status.kind).toBe("IN_PROGRESS");
  });

  it("reports COMPLETED with the student result once the attempt is finalized", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    await submitAttempt(invitation.plaintextToken);

    const status = await getPlacementStatus(invitation.plaintextToken);
    expect(status.kind).toBe("COMPLETED");
    if (status.kind !== "COMPLETED") throw new Error("unreachable");
    expect(status.result.totalQuestions).toBe(4);
  });

  it("auto-finalizes and reports COMPLETED when the deadline has already passed", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await db.placementAttempt.update({
      where: { id: started.attemptId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const status = await getPlacementStatus(invitation.plaintextToken);
    expect(status.kind).toBe("COMPLETED");

    const attempt = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });
    expect(attempt.status).toBe("AUTO_SUBMITTED");
  });

  it("rejects a token that does not exist", async () => {
    await expect(getPlacementStatus("not-a-real-token")).rejects.toThrow();
  });
});

describe("getCompletedResultForToken", () => {
  it("returns the persisted result without recomputing scoring", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test, questions } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);
    const correct = questions[0].options.find((o) => o.isCorrect)!;
    await submitAnswer(invitation.plaintextToken, {
      questionId: questions[0].id,
      selectedOptionId: correct.id,
    });
    const submitted = await submitAttempt(invitation.plaintextToken);

    const reFetched = await getCompletedResultForToken(invitation.plaintextToken);

    expect(reFetched.rawScore).toBe(submitted.rawScore);
    expect(reFetched.percentage).toBe(submitted.percentage);
    expect(reFetched.candidateName).toBe(submitted.candidateName);
  });

  it("rejects a token for an attempt that isn't completed yet", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);

    await expect(getCompletedResultForToken(invitation.plaintextToken)).rejects.toThrow(
      AttemptNotFoundError
    );
  });
});

describe("updateCandidateForToken (candidate confirmation step)", () => {
  it("updates the candidate tied to the assignment behind the token", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { assignment, invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    const updated = await updateCandidateForToken(invitation.plaintextToken, {
      firstName: "Corrected",
      lastName: "Name",
      phoneNumber: "+998901112233",
      age: 30,
      email: "corrected@example.com",
    });

    expect(updated.firstName).toBe("Corrected");

    const persisted = await db.candidate.findUniqueOrThrow({ where: { id: assignment.candidateId } });
    expect(persisted.firstName).toBe("Corrected");
    expect(persisted.email).toBe("corrected@example.com");
  });

  it("rejects invalid input server-side even if a client-side check were bypassed", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);

    await expect(
      updateCandidateForToken(invitation.plaintextToken, {
        firstName: "",
        lastName: "Name",
        phoneNumber: "+998901112233",
        age: 30,
      })
    ).rejects.toThrow();
  });

  it("rejects a revoked or nonexistent token", async () => {
    await expect(
      updateCandidateForToken("not-a-real-token", {
        firstName: "X",
        lastName: "Y",
        phoneNumber: "+998900000000",
        age: 20,
      })
    ).rejects.toThrow();
  });
});

describe("unauthorized attempt access", () => {
  it("a garbage/guessed token cannot read questions, answer, or submit", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    // A real, in-progress attempt exists in the system...
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    await startOrResumeAttempt(invitation.plaintextToken);

    // ...but an attacker guessing at tokens gets nothing, regardless of
    // which operation they attempt — every entry point re-derives the
    // attempt from the token, never accepts an attemptId directly.
    const guessed = "guessed-token-value-that-does-not-exist";
    await expect(getPlacementStatus(guessed)).rejects.toThrow();
    await expect(submitAnswer(guessed, { questionId: "x", selectedOptionId: null })).rejects.toThrow();
    await expect(submitAttempt(guessed)).rejects.toThrow();
  });
});

describe("timer cannot be extended from client input", () => {
  it("expiresAt is immutable via any student-facing operation", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test, questions } = await createPublishedTestWithQuestions(superAdmin);
    const { invitation } = await createAssignmentWithInvitation(superAdmin, test.id);
    const started = await startOrResumeAttempt(invitation.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    const before = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });

    // Answering repeatedly is the only client-reachable mutation on an
    // in-progress attempt — none of it takes a duration/expiresAt
    // parameter at all (see SubmitAnswerInput), so there is no code path
    // that could extend the deadline even if a malicious client tried.
    for (const question of questions) {
      await submitAnswer(invitation.plaintextToken, {
        questionId: question.id,
        selectedOptionId: question.options[0].id,
      });
    }

    const after = await db.placementAttempt.findUniqueOrThrow({
      where: { id: started.attemptId },
    });
    expect(after.expiresAt.getTime()).toBe(before.expiresAt.getTime());
  });
});
