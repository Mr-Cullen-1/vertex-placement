import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDb } from "../setup/db-reset";
import { createPublishedTestWithQuestions, createUser } from "./fixtures";
import { createAssignment } from "@/server/services/assignment.service";
import {
  generateInvitation,
  regenerateInvitation,
  revokeInvitation,
  validateTokenAndLoad,
} from "@/server/services/invitation.service";
import { InvitationAlreadyActiveError, InvitationRevokedError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

async function createBareAssignment(superAdmin: Awaited<ReturnType<typeof createUser>>) {
  const { test } = await createPublishedTestWithQuestions(superAdmin);
  return createAssignment(superAdmin, {
    testId: test.id,
    candidate: { firstName: "A", lastName: "B", phoneNumber: "+998900000001", age: 21 },
  });
}

describe("invitation generation", () => {
  it("refuses to create a second ACTIVE invitation while one already exists", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const assignment = await createBareAssignment(superAdmin);

    await generateInvitation(superAdmin, assignment.id);
    await expect(generateInvitation(superAdmin, assignment.id)).rejects.toThrow(
      InvitationAlreadyActiveError
    );
  });

  it("enforces at most one ACTIVE invitation per assignment at the database level too", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const assignment = await createBareAssignment(superAdmin);
    await generateInvitation(superAdmin, assignment.id);

    // Bypass the service-level check to prove the partial unique index
    // (see prisma/migrations/20260903111521_active_invitation_unique_index)
    // is the real backstop, not just the application-level check.
    await expect(
      db.placementInvitation.create({
        data: {
          assignmentId: assignment.id,
          tokenHash: "another-hash-value",
          status: "ACTIVE",
          createdByUserId: superAdmin.userId,
        },
      })
    ).rejects.toThrow();
  });
});

describe("regeneration and revocation", () => {
  it("regenerating revokes the old invitation and activates a new one for the same assignment", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const assignment = await createBareAssignment(superAdmin);
    const original = await generateInvitation(superAdmin, assignment.id);

    const regenerated = await regenerateInvitation(superAdmin, assignment.id);

    expect(regenerated.assignmentId).toBe(assignment.id);
    expect(regenerated.plaintextToken).not.toBe(original.plaintextToken);

    const oldRow = await db.placementInvitation.findUniqueOrThrow({
      where: { id: original.invitationId },
    });
    expect(oldRow.status).toBe("REVOKED");

    await expect(validateTokenAndLoad(original.plaintextToken)).rejects.toThrow(
      InvitationRevokedError
    );
    await expect(validateTokenAndLoad(regenerated.plaintextToken)).resolves.toBeDefined();
  });

  it("regenerating never touches the test or assignment definitions", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const assignment = await createBareAssignment(superAdmin);
    await generateInvitation(superAdmin, assignment.id);

    const testBefore = await db.placementTest.findUniqueOrThrow({
      where: { id: assignment.testId },
    });
    await regenerateInvitation(superAdmin, assignment.id);
    const testAfter = await db.placementTest.findUniqueOrThrow({
      where: { id: assignment.testId },
    });

    expect(testAfter.updatedAt).toEqual(testBefore.updatedAt);
  });

  it("revoking an invitation makes its token rejected", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const assignment = await createBareAssignment(superAdmin);
    const issued = await generateInvitation(superAdmin, assignment.id);

    await revokeInvitation(superAdmin, issued.invitationId);

    await expect(validateTokenAndLoad(issued.plaintextToken)).rejects.toThrow(
      InvitationRevokedError
    );
  });
});
