import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { InvalidTestStateError, TestNotFoundError } from "@/server/errors";

/**
 * PlacementTest lifecycle: DRAFT -> PUBLISHED -> ARCHIVED (see
 * /docs/ARCHITECTURE.md). Super Admin owns test definitions end to end —
 * Admin can only read. A DRAFT test is never reachable by a student; see
 * `attempt.service.ts`, which re-checks `status === "PUBLISHED"` on every
 * attempt start, not just at assignment time.
 */

const createTestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  sourceAttribution: z.string().trim().max(500).optional().nullable(),
  durationSeconds: z.number().int().min(60).max(24 * 60 * 60).default(1800),
  totalQuestionCount: z.number().int().min(1).max(1000).default(70),
});
export type CreateTestInput = z.infer<typeof createTestSchema>;

export async function createPlacementTest(actor: Actor, input: CreateTestInput) {
  assertPermission(actor, "test:write");
  const data = createTestSchema.parse(input);
  return db.placementTest.create({
    data: { ...data, createdByUserId: actor.userId },
  });
}

const updateTestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  sourceAttribution: z.string().trim().max(500).optional().nullable(),
  durationSeconds: z.number().int().min(60).max(24 * 60 * 60).optional(),
});
export type UpdateTestInput = z.infer<typeof updateTestSchema>;

/** Content-affecting edits are only allowed while DRAFT — a PUBLISHED
 * test is what students may currently be mid-attempt against, so its
 * definition must not shift under them. */
export async function updatePlacementTest(
  actor: Actor,
  testId: string,
  input: UpdateTestInput
) {
  assertPermission(actor, "test:write");
  const data = updateTestSchema.parse(input);
  const test = await requireTest(testId);
  if (test.status !== "DRAFT") {
    throw new InvalidTestStateError("Only a DRAFT test can be edited.");
  }
  return db.placementTest.update({ where: { id: testId }, data });
}

export async function getPlacementTest(actor: Actor, testId: string) {
  assertPermission(actor, "test:read");
  return requireTest(testId);
}

export async function listPlacementTests(actor: Actor) {
  assertPermission(actor, "test:read");
  return db.placementTest.findMany({ orderBy: { createdAt: "desc" } });
}

export async function publishPlacementTest(actor: Actor, testId: string) {
  assertPermission(actor, "test:write");
  const test = await requireTest(testId);
  if (test.status !== "DRAFT") {
    throw new InvalidTestStateError("Only a DRAFT test can be published.");
  }
  const publishedQuestionCount = await db.question.count({
    where: { testId, status: "PUBLISHED" },
  });
  if (publishedQuestionCount === 0) {
    throw new InvalidTestStateError(
      "A test needs at least one published question before it can be published."
    );
  }
  return db.placementTest.update({ where: { id: testId }, data: { status: "PUBLISHED" } });
}

/** ARCHIVED is reachable from either DRAFT or PUBLISHED — archiving a
 * published test stops new assignments from being created against it
 * (enforced in assignment.service.ts) without touching attempts already
 * in progress. */
export async function archivePlacementTest(actor: Actor, testId: string) {
  assertPermission(actor, "test:write");
  const test = await requireTest(testId);
  if (test.status === "ARCHIVED") {
    throw new InvalidTestStateError("Test is already archived.");
  }
  return db.placementTest.update({ where: { id: testId }, data: { status: "ARCHIVED" } });
}

async function requireTest(testId: string) {
  const test = await db.placementTest.findUnique({ where: { id: testId } });
  if (!test) throw new TestNotFoundError();
  return test;
}
