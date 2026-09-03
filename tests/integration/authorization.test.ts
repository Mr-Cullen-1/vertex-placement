import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createPublishedTestWithQuestions, createUser } from "./fixtures";
import { createPlacementTest, updatePlacementTest } from "@/server/services/placement-test.service";
import { createQuestion } from "@/server/services/question.service";
import { createPlacementBand } from "@/server/services/placement-band.service";
import { createAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";
import { ForbiddenError } from "@/server/errors";

beforeEach(async () => {
  await resetDb();
});

describe("Admin cannot author test content", () => {
  it("cannot create a placement test", async () => {
    const admin = await createUser("ADMIN");
    await expect(
      createPlacementTest(admin, { title: "Should fail", durationSeconds: 1800, totalQuestionCount: 4 })
    ).rejects.toThrow(ForbiddenError);
  });

  it("cannot edit an existing placement test", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    await expect(updatePlacementTest(admin, test.id, { title: "Hijacked" })).rejects.toThrow(
      ForbiddenError
    );
  });

  it("cannot create a question", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const test = await createPlacementTest(superAdmin, {
      title: "Draft",
      durationSeconds: 1800,
      totalQuestionCount: 1,
    });

    await expect(
      createQuestion(admin, test.id, {
        order: 1,
        prompt: "Injected question",
        options: [
          { text: "A", isCorrect: true, order: 1 },
          { text: "B", isCorrect: false, order: 2 },
        ],
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it("cannot modify scoring bands", async () => {
    const superAdmin = await createUser("SUPER_ADMIN");
    const admin = await createUser("ADMIN");
    const { test } = await createPublishedTestWithQuestions(superAdmin);

    await expect(
      createPlacementBand(admin, test.id, {
        order: 99,
        label: "Injected",
        minPercentage: 0,
        maxPercentage: 100,
      })
    ).rejects.toThrow(ForbiddenError);
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

describe("Super Admin can do everything Admin can, plus authoring", () => {
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
