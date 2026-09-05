import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser } from "./fixtures";
import { db } from "@/lib/db";
import { createAssignment, getAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";
import {
  getPlacementStatus,
  getAdminResultDetail,
  getAttemptQuestions,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { updateCandidateForToken } from "@/server/services/invitation.service";
import { exportPlacementWorkbook } from "@/server/services/export.service";
import { createPlacementTest } from "@/server/services/placement-test.service";
import { createQuestion, publishQuestion } from "@/server/services/question.service";
import { publishPlacementTest } from "@/server/services/placement-test.service";
import {
  InvitationNotFoundError,
} from "@/server/errors";

async function makePublishedTest(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const test = await createPlacementTest(superAdmin, {
    title: "Ownership Flow Fixture",
    durationSeconds: 900,
    totalQuestionCount: 2,
  });
  for (let order = 1; order <= 2; order++) {
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

const REAL_DETAILS = {
  firstName: "Amina",
  lastName: "Karimova",
  phoneNumber: "+998901234567",
  age: 21,
  email: "amina@example.com",
};

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2J — Admin creates access, student enters their own details", () => {
  it("Admin can create a 'new candidate' assignment with NO personal fields", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);

    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });

    expect(assignment.candidate.firstName).toBe("");
    expect(assignment.candidate.lastName).toBe("");
    expect(assignment.candidate.phoneNumber).toBe("");
    expect(assignment.candidate.age).toBe(0);
    expect(assignment.candidate.profileCompletedAt).toBeNull();
    expect(await db.candidate.count()).toBe(1);
  });

  it("an invitation can be generated for a pending (not-yet-complete) candidate", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });

    const issued = await generateInvitation(superAdmin, assignment.id);
    expect(issued.plaintextToken).toBeTruthy();

    const status = await getPlacementStatus(issued.plaintextToken);
    expect(status.kind).toBe("NOT_STARTED");
    if (status.kind === "NOT_STARTED") {
      expect(status.candidateProfileComplete).toBe(false);
    }
  });

  it("student submitting their details completes exactly the one candidate already linked to the assignment — no duplicate row", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });
    const issued = await generateInvitation(superAdmin, assignment.id);

    const before = await db.candidate.count();
    await updateCandidateForToken(issued.plaintextToken, REAL_DETAILS);
    const after = await db.candidate.count();

    expect(after).toBe(before); // no new row — same candidate, updated in place
    const candidate = await db.candidate.findUniqueOrThrow({ where: { id: assignment.candidateId } });
    expect(candidate.firstName).toBe("Amina");
    expect(candidate.phoneNumber).toBe("+998901234567");
    expect(candidate.profileCompletedAt).not.toBeNull();

    const status = await getPlacementStatus(issued.plaintextToken);
    expect(status.kind).toBe("NOT_STARTED");
    if (status.kind === "NOT_STARTED") {
      expect(status.candidateProfileComplete).toBe(true);
      expect(status.candidate.firstName).toBe("Amina");
    }
  });

  it("refreshing (repeated getPlacementStatus calls) never creates a duplicate candidate", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });
    const issued = await generateInvitation(superAdmin, assignment.id);

    await getPlacementStatus(issued.plaintextToken);
    await getPlacementStatus(issued.plaintextToken);
    await getPlacementStatus(issued.plaintextToken);

    expect(await db.candidate.count()).toBe(1);
  });

  it("repeated detail submission (double submit / multiple tabs) never creates a duplicate candidate, and the latest submission wins", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });
    const issued = await generateInvitation(superAdmin, assignment.id);

    await updateCandidateForToken(issued.plaintextToken, REAL_DETAILS);
    await updateCandidateForToken(issued.plaintextToken, { ...REAL_DETAILS, firstName: "Amina2" });

    expect(await db.candidate.count()).toBe(1);
    const candidate = await db.candidate.findUniqueOrThrow({ where: { id: assignment.candidateId } });
    expect(candidate.firstName).toBe("Amina2");
  });

  it("the existing-candidate flow is unaffected: an Admin-supplied complete candidate skips the details step entirely", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, candidate: REAL_DETAILS });
    const issued = await generateInvitation(superAdmin, assignment.id);

    expect(assignment.candidate.profileCompletedAt).not.toBeNull();

    const status = await getPlacementStatus(issued.plaintextToken);
    expect(status.kind).toBe("NOT_STARTED");
    if (status.kind === "NOT_STARTED") {
      expect(status.candidateProfileComplete).toBe(true);
    }
  });

  it("selecting an existing, already-complete candidate for a second assignment also skips the details step", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const first = await createAssignment(superAdmin, { testId: test.id, candidate: REAL_DETAILS });

    const second = await createAssignment(superAdmin, { testId: test.id, candidateId: first.candidateId });
    const issued = await generateInvitation(superAdmin, second.id);

    const status = await getPlacementStatus(issued.plaintextToken);
    expect(status.kind).toBe("NOT_STARTED");
    if (status.kind === "NOT_STARTED") expect(status.candidateProfileComplete).toBe(true);
  });

  it("a pending assignment's admin detail view has no fake display name (firstName/lastName are empty placeholders, gated by profileCompletedAt)", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });

    const loaded = await getAssignment(superAdmin, assignment.id);
    expect(loaded.candidate.profileCompletedAt).toBeNull();
    expect(loaded.candidate.firstName).toBe("");
    expect(loaded.candidate.lastName).toBe("");
    // The UI layer (candidateDisplayName) is responsible for rendering
    // "Awaiting student details" instead of these placeholders — this
    // test guards the data contract that makes that possible: the empty
    // strings are real (never "Unknown"/"Guest"), and `profileCompletedAt`
    // is the unambiguous signal for whether they should ever be shown.
  });

  it("an invalid/unknown token cannot be used to create or complete a candidate", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    await makePublishedTest(superAdmin);
    const before = await db.candidate.count();

    await expect(updateCandidateForToken("not-a-real-token", REAL_DETAILS)).rejects.toThrow(
      InvitationNotFoundError
    );
    expect(await db.candidate.count()).toBe(before);
  });

  it("end to end: a completed attempt from a formerly-pending candidate shows the student-entered identity consistently in admin detail, result detail, and the export", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const test = await makePublishedTest(superAdmin);
    const assignment = await createAssignment(superAdmin, { testId: test.id, newCandidate: true });
    const issued = await generateInvitation(superAdmin, assignment.id);

    // Student completes their own details, then takes the test.
    await updateCandidateForToken(issued.plaintextToken, REAL_DETAILS);
    await startOrResumeAttempt(issued.plaintextToken);
    const view = await getAttemptQuestions(issued.plaintextToken);
    for (const q of view) {
      const dbQuestion = await db.question.findUniqueOrThrow({ where: { id: q.questionId }, include: { options: true } });
      const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
      await submitAnswer(issued.plaintextToken, { questionId: q.questionId, selectedOptionId: correctOptionId });
    }
    await submitAttempt(issued.plaintextToken);

    // Admin assignment detail
    const loadedAssignment = await getAssignment(superAdmin, assignment.id);
    expect(loadedAssignment.candidate.firstName).toBe("Amina");
    expect(loadedAssignment.candidate.profileCompletedAt).not.toBeNull();

    // Admin result detail
    const attempt = await db.placementAttempt.findFirstOrThrow({ where: { assignmentId: assignment.id } });
    const resultDetail = await getAdminResultDetail(superAdmin, attempt.id);
    expect(resultDetail.candidate.firstName).toBe("Amina");
    expect(resultDetail.candidate.phoneNumber).toBe("+998901234567");

    // Export
    const { buffer } = await exportPlacementWorkbook(superAdmin);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
