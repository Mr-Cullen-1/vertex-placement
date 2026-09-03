import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createPublishedTestWithQuestions, createUser } from "./fixtures";
import { createCandidate, getCandidate, listCandidates } from "@/server/services/candidate.service";
import { createAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";
import {
  getAdminResultDetail,
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { AttemptNotFoundError, CandidateNotFoundError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2B — candidate management", () => {
  it("Admin can create, read, and list candidates", async () => {
    const admin = await createUser("ADMIN");
    const created = await createCandidate(admin, {
      firstName: "Jane",
      lastName: "Doe",
      phoneNumber: "+998900001234",
      age: 24,
    });

    const fetched = await getCandidate(admin, created.id);
    expect(fetched.firstName).toBe("Jane");

    const all = await listCandidates(admin);
    expect(all.some((c) => c.id === created.id)).toBe(true);
  });

  it("Super Admin can also create and read candidates", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const created = await createCandidate(superAdmin, {
      firstName: "John",
      lastName: "Smith",
      phoneNumber: "+998900005678",
      age: 30,
    });
    expect(created.id).toBeTruthy();
  });

  it("throws CandidateNotFoundError for a non-existent candidate id", async () => {
    const admin = await createUser("ADMIN");
    await expect(getCandidate(admin, "does-not-exist")).rejects.toThrow(CandidateNotFoundError);
  });
});

describe("Phase 2B — admin result detail", () => {
  async function completeAnAttempt(actor: Awaited<ReturnType<typeof createUser>>) {
    const { test, questions } = await createPublishedTestWithQuestions(actor);
    const assignment = await createAssignment(actor, {
      testId: test.id,
      candidate: { firstName: "Result", lastName: "Candidate", phoneNumber: "+998900009999", age: 19 },
    });
    const issued = await generateInvitation(actor, assignment.id);

    await startOrResumeAttempt(issued.plaintextToken);
    const view = await getAttemptQuestions(issued.plaintextToken);
    for (const q of view) {
      await submitAnswer(issued.plaintextToken, {
        questionId: q.questionId,
        selectedOptionId: q.options[0]!.id,
      });
    }
    const summary = await submitAttempt(issued.plaintextToken);
    return { summary, questions };
  }

  it("Admin can view the full result detail, including the answer key", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { summary } = await completeAnAttempt(superAdmin);

    const detail = await getAdminResultDetail(admin, summary.attemptId);

    expect(detail.candidate.firstName).toBe("Result");
    expect(detail.questionAnalysis).toHaveLength(4);
    // Admin detail exposes the correct answer text for every question —
    // something the student-facing result summary never does (see
    // domain/results/present.ts buildStudentResultSummary).
    for (const q of detail.questionAnalysis) {
      expect(q.correctOptionText).toBeTruthy();
    }
  });

  it("Super Admin can also view result detail", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { summary } = await completeAnAttempt(superAdmin);

    const detail = await getAdminResultDetail(superAdmin, summary.attemptId);
    expect(detail.attemptId).toBe(summary.attemptId);
  });

  it("throws AttemptNotFoundError for an attempt with no result yet", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "In", lastName: "Progress", phoneNumber: "+998900001111", age: 20 },
    });
    const issued = await generateInvitation(superAdmin, assignment.id);
    const started = await startOrResumeAttempt(issued.plaintextToken);
    if (started.status !== "IN_PROGRESS") throw new Error("unreachable");

    await expect(getAdminResultDetail(superAdmin, started.attemptId)).rejects.toThrow(
      AttemptNotFoundError
    );
  });

  it("throws AttemptNotFoundError for a completely unknown attempt id", async () => {
    const admin = await createUser("ADMIN");
    await expect(getAdminResultDetail(admin, "does-not-exist")).rejects.toThrow(
      AttemptNotFoundError
    );
  });
});
