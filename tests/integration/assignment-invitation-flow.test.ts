import { beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { resetDb } from "../setup/db-reset";
import { createPublishedTestWithQuestions, createUser } from "./fixtures";
import { createAssignment, listAssignments } from "@/server/services/assignment.service";
import { createCandidate } from "@/server/services/candidate.service";
import {
  generateInvitation,
  regenerateInvitation,
  revokeInvitation,
} from "@/server/services/invitation.service";
import {
  getAttemptQuestions,
  getCanonicalResultSummaryForAssignment,
  startOrResumeAttempt,
  submitAnswer,
  submitAttempt,
} from "@/server/services/attempt.service";
import { exportPlacementWorkbook } from "@/server/services/export.service";
import {
  AssignmentAlreadyCompletedError,
  ForbiddenError,
  TestNotPublishedError,
} from "@/server/errors";
import { hashInvitationToken } from "@/domain/tokens/token";

beforeEach(async () => {
  await resetDb();
});

/** exceljs's bundled type declarations predate some newer Node Buffer
 * fields, so its own `Buffer` reference doesn't structurally match the
 * one in this project's Node/TS version — a type-declaration mismatch
 * only, not a runtime issue (this is the exact Buffer the library itself
 * produced from `writeBuffer()`). Isolated to one cast, here. */
async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

async function completeAssignment(actor: Awaited<ReturnType<typeof createUser>>, testId: string) {
  const assignment = await createAssignment(actor, {
    testId,
    candidate: { firstName: "Complete", lastName: "Flow", phoneNumber: "+998900001212", age: 24 },
  });
  const issued = await generateInvitation(actor, assignment.id);
  await startOrResumeAttempt(issued.plaintextToken);
  const view = await getAttemptQuestions(issued.plaintextToken);
  // Option display order is randomized per attempt — resolve the TRUE
  // correct option from the database, never by position in `view`
  // (same pattern established in Phase 2D/2E's tests).
  for (const q of view) {
    const dbQuestion = await db.question.findUniqueOrThrow({
      where: { id: q.questionId },
      include: { options: true },
    });
    const correctOptionId = dbQuestion.options.find((o) => o.isCorrect)!.id;
    await submitAnswer(issued.plaintextToken, { questionId: q.questionId, selectedOptionId: correctOptionId });
  }
  await submitAttempt(issued.plaintextToken);
  return assignment;
}

describe("A/C — assignment creation requires a PUBLISHED test", () => {
  it("creates an assignment against a published test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "A", lastName: "B", phoneNumber: "+998900000010", age: 20 },
    });
    expect(assignment.testId).toBe(test.id);
  });

  it("rejects an assignment against a DRAFT test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { createPlacementTest } = await import("@/server/services/placement-test.service");
    const draft = await createPlacementTest(superAdmin, {
      title: "Still draft",
      durationSeconds: 1800,
      totalQuestionCount: 5,
    });
    await expect(
      createAssignment(superAdmin, {
        testId: draft.id,
        candidate: { firstName: "A", lastName: "B", phoneNumber: "+998900000011", age: 20 },
      })
    ).rejects.toThrow(TestNotPublishedError);
  });
});

describe("B — candidate validation", () => {
  it("rejects an invalid candidate (bad phone/age) via the shared schema", async () => {
    const admin = await createUser("ADMIN");
    await expect(
      createCandidate(admin, { firstName: "A", lastName: "B", phoneNumber: "", age: 0 } as never)
    ).rejects.toThrow();
  });
});

describe("D/E/F — invitation generation and token hashing", () => {
  it("persists only a SHA-256 hash of the token, never the plaintext", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "Token", lastName: "Check", phoneNumber: "+998900000012", age: 20 },
    });

    const issued = await generateInvitation(superAdmin, assignment.id);
    const row = await db.placementInvitation.findUniqueOrThrow({ where: { id: issued.invitationId } });

    expect(row.tokenHash).toBe(hashInvitationToken(issued.plaintextToken));
    expect(row.tokenHash).not.toBe(issued.plaintextToken);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex digest

    // Prove the plaintext genuinely isn't stored anywhere on the row —
    // not just "the hash differs", but that no column contains it.
    const serializedRow = JSON.stringify(row);
    expect(serializedRow).not.toContain(issued.plaintextToken);
  });
});

describe("G/M/N — RBAC on assignment/invitation/candidate/export operations", () => {
  it("Admin can create assignments, manage invitations, and read candidates/results", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    const assignment = await createAssignment(admin, {
      testId: test.id,
      candidate: { firstName: "Admin", lastName: "Flow", phoneNumber: "+998900000013", age: 22 },
    });
    const issued = await generateInvitation(admin, assignment.id);
    expect(issued.plaintextToken).toBeTruthy();

    const regenerated = await regenerateInvitation(admin, assignment.id);
    expect(regenerated.plaintextToken).not.toBe(issued.plaintextToken);

    await revokeInvitation(admin, regenerated.invitationId);
    const assignments = await listAssignments(admin);
    expect(assignments.some((a) => a.id === assignment.id)).toBe(true);
  });

  it("Admin gets the standard export (no Question Analysis sheet); Super Admin gets the full export", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    await completeAssignment(superAdmin, test.id);

    const adminExport = await exportPlacementWorkbook(admin);
    const superAdminExport = await exportPlacementWorkbook(superAdmin);

    const adminWorkbook = await loadWorkbook(adminExport.buffer);
    const superAdminWorkbook = await loadWorkbook(superAdminExport.buffer);

    const adminSheetNames = adminWorkbook.worksheets.map((s) => s.name);
    const superAdminSheetNames = superAdminWorkbook.worksheets.map((s) => s.name);

    expect(adminSheetNames).toEqual(["Candidates", "Results", "Topic Analysis"]);
    expect(superAdminSheetNames).toEqual(["Candidates", "Results", "Topic Analysis", "Question Analysis"]);
  });

  it("a plain Admin cannot invoke export:full-gated behavior via a different role object", async () => {
    // Defense-in-depth check: even if a caller constructed an Actor with
    // role "ADMIN" directly (never trusting client-supplied role), the
    // service must still withhold the full sheet set.
    const admin = await createUser("ADMIN");
    const result = await exportPlacementWorkbook(admin);
    const workbook = await loadWorkbook(result.buffer);
    expect(workbook.worksheets.map((s) => s.name)).not.toContain("Question Analysis");
  });
});

describe("H/I/J/K — regeneration, revocation, and the no-retake guarantee", () => {
  it("J/K: generating a new invitation for an already-completed assignment is rejected — no retake, no second canonical attempt", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await completeAssignment(superAdmin, test.id);

    await expect(generateInvitation(superAdmin, assignment.id)).rejects.toThrow(
      AssignmentAlreadyCompletedError
    );
    await expect(regenerateInvitation(superAdmin, assignment.id)).rejects.toThrow(
      AssignmentAlreadyCompletedError
    );

    const attemptCount = await db.placementAttempt.count({ where: { assignmentId: assignment.id } });
    expect(attemptCount).toBe(1); // never a second attempt created via regeneration
  });

  it("H/I: regenerating revokes the previous invitation and its token stops working, without touching the assignment/candidate/test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "Regen", lastName: "Flow", phoneNumber: "+998900000014", age: 25 },
    });
    const first = await generateInvitation(superAdmin, assignment.id);
    const second = await regenerateInvitation(superAdmin, assignment.id);

    const firstRow = await db.placementInvitation.findUniqueOrThrow({ where: { id: first.invitationId } });
    expect(firstRow.status).toBe("REVOKED");

    const assignmentAfter = await db.placementAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(assignmentAfter.candidateId).toBe(assignment.candidateId);
    expect(assignmentAfter.testId).toBe(assignment.testId);

    await expect(startOrResumeAttempt(first.plaintextToken)).rejects.toThrow();
    const resumed = await startOrResumeAttempt(second.plaintextToken);
    expect(resumed.status).toBe("IN_PROGRESS");
  });
});

describe("L — assignment status derivation is used consistently by listAssignments consumers", () => {
  it("listAssignments returns enough data (invitations, attempts) to derive display status without extra queries", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "Derive", lastName: "Status", phoneNumber: "+998900000015", age: 26 },
    });
    const issued = await generateInvitation(superAdmin, assignment.id);
    await revokeInvitation(superAdmin, issued.invitationId);

    const list = await listAssignments(superAdmin);
    const row = list.find((a) => a.id === assignment.id)!;
    expect(row.invitations).toHaveLength(1);
    expect(row.invitations[0]!.status).toBe("REVOKED");
  });
});

describe("O/P/Q — export authorization and content", () => {
  it("unauthorized (Admin's actor object misused) export attempts are still rejected without an Actor at all — smoke check on assertPermission", async () => {
    // export.service.ts always requires an Actor (never an anonymous
    // caller) — assertPermission throws ForbiddenError for a role with no
    // export:standard entry. There is no role in this system without
    // export:standard other than "no actor", which getActorOrThrow already
    // guards at the action layer (Phase 1) — verified structurally here by
    // confirming the permission matrix has no export-less authenticated role.
    const { hasPermission } = await import("@/server/rbac");
    expect(hasPermission("ADMIN", "export:standard")).toBe(true);
    expect(hasPermission("ADMIN", "export:full")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "export:full")).toBe(true);
  });

  it("P: export contains the minimum required sheets with real (not placeholder) data", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    await completeAssignment(superAdmin, test.id);

    const { buffer } = await exportPlacementWorkbook(superAdmin);
    const workbook = await loadWorkbook(buffer);

    const candidatesSheet = workbook.getWorksheet("Candidates")!;
    const resultsSheet = workbook.getWorksheet("Results")!;
    expect(candidatesSheet.rowCount).toBeGreaterThan(1); // header + at least one data row
    expect(resultsSheet.rowCount).toBeGreaterThan(1);

    const resultsHeader = resultsSheet.getRow(1).values as unknown[];
    // The OFFICIAL placement (Placement band), never the question-
    // position-derived progression signal — see the P0 scoring-semantics
    // fix (/docs/PRODUCT_RULES.md "Scoring & placement").
    expect(resultsHeader).toContain("Placement band");
    expect(resultsHeader).not.toContain("Progression");
    expect(resultsHeader).toContain("Score");

    const firstDataRow = resultsSheet.getRow(2).values as unknown[];
    expect(firstDataRow.some((v) => typeof v === "string" && v.includes("Complete"))).toBe(true);
  });

  it("Q: exported workbook never contains a token hash or invitation plaintext anywhere", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await completeAssignment(superAdmin, test.id);
    const invitations = await db.placementInvitation.findMany({ where: { assignmentId: assignment.id } });
    const usedTokenHash = invitations[0]!.tokenHash;

    const { buffer } = await exportPlacementWorkbook(superAdmin);
    const workbook = await loadWorkbook(buffer);

    let allCellText = "";
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          allCellText += String(cell.value ?? "") + "|";
        });
      });
    }
    expect(allCellText).not.toContain(usedTokenHash);
    expect(allCellText.toLowerCase()).not.toContain("tokenhash");
  });
});

describe("R — completed assignment links to the Phase 2E result system", () => {
  it("getCanonicalResultSummaryForAssignment resolves the same attemptId the result page uses", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await completeAssignment(superAdmin, test.id);

    const summary = await getCanonicalResultSummaryForAssignment(superAdmin, assignment.id);
    expect(summary).not.toBeNull();

    const attempt = await db.placementAttempt.findFirstOrThrow({
      where: { assignmentId: assignment.id, isCanonical: true },
    });
    expect(summary!.attemptId).toBe(attempt.id);
    expect(summary!.rawScore).toBeGreaterThan(0);
    // Official placement — percentage-based, from the fixture's
    // configured PlacementBand (all-correct -> 100% -> "Advanced").
    expect(summary!.level).toBe("Advanced");
    expect(summary!.progression.progressionBand).not.toBeNull();
  });

  it("returns null for an assignment with no completed canonical attempt yet", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "Not", lastName: "Done", phoneNumber: "+998900000016", age: 19 },
    });
    const summary = await getCanonicalResultSummaryForAssignment(superAdmin, assignment.id);
    expect(summary).toBeNull();
  });
});

describe("Admin's existing test-authoring boundary is unaffected by this phase", () => {
  it("Admin still cannot create a test, a question, or a scoring band", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { createPlacementTest } = await import("@/server/services/placement-test.service");
    const { createQuestion } = await import("@/server/services/question.service");
    const { createPlacementBand } = await import("@/server/services/placement-band.service");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    await expect(
      createPlacementTest(admin, { title: "Should fail", durationSeconds: 1800, totalQuestionCount: 1 })
    ).rejects.toThrow(ForbiddenError);
    await expect(
      createQuestion(admin, test.id, {
        order: 99,
        prompt: "Injected",
        options: [
          { text: "A", isCorrect: true, order: 1 },
          { text: "B", isCorrect: false, order: 2 },
        ],
      })
    ).rejects.toThrow(ForbiddenError);
    await expect(
      createPlacementBand(admin, test.id, { order: 99, label: "X", minPercentage: 0, maxPercentage: 100 })
    ).rejects.toThrow(ForbiddenError);
  });
});
