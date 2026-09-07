import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createPublishedTestWithQuestions, createUser } from "./fixtures";
import { createPlacementTest, updatePlacementTest } from "@/server/services/placement-test.service";
import { createQuestion } from "@/server/services/question.service";
import { createPlacementBand } from "@/server/services/placement-band.service";
import { createAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";

beforeEach(async () => {
  await resetDb();
});

/**
 * Correction pass: test/question/band authoring was Super-Admin-only
 * through the MVP build (this file used to assert Admin was rejected
 * here) — corrected to Admin + Super Admin, since that restriction only
 * ever served as a stand-in for account/role trust before Admin-account
 * management existed. See /docs/PRODUCT_RULES.md "Roles". The one
 * remaining Admin-cannot boundary is admin-account management itself —
 * see tests/integration/admin-management.test.ts.
 */
describe("Admin CAN author test content", () => {
  it("can create a placement test", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Admin-authored",
      durationSeconds: 1800,
      totalQuestionCount: 4,
    });
    expect(test.status).toBe("DRAFT");
  });

  it("can edit an existing placement test", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Draft",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });
    const updated = await updatePlacementTest(admin, test.id, { title: "Renamed" });
    expect(updated.title).toBe("Renamed");
  });

  it("can create a question", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Draft",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });

    const question = await createQuestion(admin, test.id, {
      order: 1,
      prompt: "Admin-authored question",
      options: [
        { text: "A", isCorrect: true, order: 1 },
        { text: "B", isCorrect: false, order: 2 },
      ],
    });
    expect(question.prompt).toBe("Admin-authored question");
  });

  it("can create scoring bands", async () => {
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(admin, {
      title: "Draft",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });

    const band = await createPlacementBand(admin, test.id, {
      order: 0,
      label: "Beginner",
      minPercentage: 0,
      maxPercentage: 100,
    });
    expect(band.label).toBe("Beginner");
  });
});

describe("Admin CAN operate assignments and invitations", () => {
  it("can create an assignment and generate an invitation", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    const assignment = await createAssignment(admin, {
      testId: test.id,
      candidate: { firstName: "A", lastName: "B", phoneNumber: "+998900000002", age: 22 },
    });
    const issued = await generateInvitation(admin, assignment.id);

    expect(issued.plaintextToken).toBeTruthy();
  });
});

describe("Super Admin can do everything Admin can", () => {
  it("can create, publish, and modify test content end to end", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);
    expect(test.status).toBe("PUBLISHED");
  });

  it("can also create assignments and invitations", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    const assignment = await createAssignment(superAdmin, {
      testId: test.id,
      candidate: { firstName: "A", lastName: "B", phoneNumber: "+998900000003", age: 23 },
    });
    const issued = await generateInvitation(superAdmin, assignment.id);
    expect(issued.plaintextToken).toBeTruthy();
  });
});
