import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import {
  AssignmentNotFoundError,
  CandidateNotFoundError,
  TestNotFoundError,
  TestNotPublishedError,
} from "@/server/errors";

/**
 * A PlacementAssignment is "this candidate is being asked to complete
 * this test" — intent/session, independent of any invitation ever being
 * generated. See /docs/DATABASE.md. Available to both Admin and Super
 * Admin.
 */

const candidateInputSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phoneNumber: z.string().trim().min(1).max(30),
  age: z.number().int().min(1).max(120),
  email: z.email().max(255).optional().nullable(),
});

const createAssignmentSchema = z
  .object({
    testId: z.string().min(1),
    candidateId: z.string().min(1).optional(),
    candidate: candidateInputSchema.optional(),
  })
  .refine((input) => Boolean(input.candidateId) !== Boolean(input.candidate), {
    message: "Provide exactly one of candidateId or candidate.",
  });
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

/** A test can only be assigned once it's PUBLISHED — a DRAFT test has no
 * finished content to serve, and an ARCHIVED one is retired. */
export async function createAssignment(actor: Actor, input: CreateAssignmentInput) {
  assertPermission(actor, "assignment:write");
  const data = createAssignmentSchema.parse(input);

  const test = await db.placementTest.findUnique({ where: { id: data.testId } });
  if (!test) throw new TestNotFoundError();
  if (test.status !== "PUBLISHED") throw new TestNotPublishedError();

  return db.$transaction(async (tx) => {
    let candidateId = data.candidateId;
    if (candidateId) {
      const candidate = await tx.candidate.findUnique({ where: { id: candidateId } });
      if (!candidate) throw new CandidateNotFoundError();
    } else if (data.candidate) {
      const candidate = await tx.candidate.create({ data: data.candidate });
      candidateId = candidate.id;
    }

    return tx.placementAssignment.create({
      data: {
        testId: data.testId,
        candidateId: candidateId!,
        createdByUserId: actor.userId,
      },
      include: { candidate: true, test: true },
    });
  });
}

export async function getAssignment(actor: Actor, assignmentId: string) {
  assertPermission(actor, "assignment:write");
  const assignment = await db.placementAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      candidate: true,
      test: true,
      invitations: { orderBy: { createdAt: "desc" } },
      attempts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!assignment) throw new AssignmentNotFoundError();
  return assignment;
}

/** Includes invitation status rows (not the full invitation record — no
 * `tokenHash` crosses this boundary) and a minimal attempt summary (id/
 * isCanonical/status only) so callers can derive display status (see
 * /domain/placement/assignment-status.ts) and locate the canonical
 * completed attempt (for the Score/Progression columns and the Excel
 * export) without a second query per row. */
export async function listAssignments(actor: Actor) {
  assertPermission(actor, "assignment:write");
  return db.placementAssignment.findMany({
    include: {
      candidate: true,
      test: true,
      invitations: { select: { status: true } },
      attempts: { select: { id: true, isCanonical: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
