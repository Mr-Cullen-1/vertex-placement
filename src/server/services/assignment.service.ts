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
    // Phase 2J: an Admin creating an assignment for a brand-new candidate
    // no longer supplies that candidate's personal details up front — the
    // candidate provides them via the invitation token, the first time
    // they open it (see /docs/PRODUCT_RULES.md "Candidate ownership").
    // `candidate` (full details) is kept, not removed, for any existing
    // caller that still wants to create a fully-specified candidate in
    // one step; the admin UI (NewAssignmentDialog) now only ever sends
    // `newCandidate: true`.
    newCandidate: z.literal(true).optional(),
  })
  .refine(
    (input) => [Boolean(input.candidateId), Boolean(input.candidate), Boolean(input.newCandidate)]
      .filter(Boolean).length === 1,
    { message: "Provide exactly one of candidateId, candidate, or newCandidate." }
  );
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
      const candidate = await tx.candidate.create({
        data: { ...data.candidate, profileCompletedAt: new Date() },
      });
      candidateId = candidate.id;
    } else if (data.newCandidate) {
      // Placeholder only — never a fake display name. Every consumer
      // must render this candidate via `candidateDisplayName`
      // (src/lib/format.ts), which checks `profileCompletedAt` (left
      // null here) rather than trusting firstName/lastName directly.
      const candidate = await tx.candidate.create({
        data: { firstName: "", lastName: "", phoneNumber: "", age: 0, email: null, profileCompletedAt: null },
      });
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
