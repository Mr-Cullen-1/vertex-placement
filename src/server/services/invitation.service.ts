import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import {
  AssignmentAlreadyCompletedError,
  AssignmentNotFoundError,
  InvitationAlreadyActiveError,
  InvitationNotFoundError,
  InvitationRevokedError,
  InvitationUsedError,
  InvitationExpiredError,
} from "@/server/errors";
import {
  generateInvitationToken,
  hashInvitationToken,
  validateInvitation,
  type InvitationRecordForValidation,
} from "@/domain/tokens/token";
import { candidateInputSchema } from "@/domain/candidate/schema";

/**
 * Invitation/token lifecycle. See /docs/ARCHITECTURE.md ("Token
 * lifecycle") and /docs/PHASE_1.md ("Security review") — the plaintext
 * token is generated here, returned to the caller exactly once, and NEVER
 * logged or persisted (only its SHA-256 hash is). Do not add a
 * console.log/console.error of `plaintextToken` anywhere in this file.
 */

export interface IssuedInvitation {
  invitationId: string;
  assignmentId: string;
  /** The value to put in the student URL. Shown to the admin exactly
   * once, at generation time. */
  plaintextToken: string;
  status: "ACTIVE";
  createdAt: Date;
}

export async function generateInvitation(
  actor: Actor,
  assignmentId: string
): Promise<IssuedInvitation> {
  assertPermission(actor, "invitation:write");

  const assignment = await db.placementAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new AssignmentNotFoundError();
  if (assignment.status === "COMPLETED") throw new AssignmentAlreadyCompletedError();

  const existingActive = await db.placementInvitation.findFirst({
    where: { assignmentId, status: "ACTIVE" },
  });
  if (existingActive) throw new InvitationAlreadyActiveError();

  const { plaintext, hash } = generateInvitationToken();
  const invitation = await db.placementInvitation.create({
    data: { assignmentId, tokenHash: hash, createdByUserId: actor.userId },
  });

  return toIssuedInvitation(invitation, plaintext);
}

/** Old invitation -> REVOKED, new invitation -> ACTIVE, same assignment.
 * This is explicitly NOT a retake — see /docs/PRODUCT_RULES.md. */
export async function regenerateInvitation(
  actor: Actor,
  assignmentId: string
): Promise<IssuedInvitation> {
  assertPermission(actor, "invitation:write");

  const assignment = await db.placementAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new AssignmentNotFoundError();
  if (assignment.status === "COMPLETED") throw new AssignmentAlreadyCompletedError();

  const current = await db.placementInvitation.findFirst({
    where: { assignmentId, status: "ACTIVE" },
  });
  if (!current) throw new InvitationNotFoundError();

  const { plaintext, hash } = generateInvitationToken();

  const created = await db.$transaction(async (tx) => {
    await tx.placementInvitation.update({
      where: { id: current.id },
      data: { status: "REVOKED" },
    });
    return tx.placementInvitation.create({
      data: {
        assignmentId,
        tokenHash: hash,
        createdByUserId: actor.userId,
        regeneratedFromId: current.id,
      },
    });
  });

  return toIssuedInvitation(created, plaintext);
}

export async function revokeInvitation(actor: Actor, invitationId: string) {
  assertPermission(actor, "invitation:write");
  const invitation = await db.placementInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw new InvitationNotFoundError();
  if (invitation.status !== "ACTIVE") {
    // Already REVOKED/USED — revoking again is a no-op, not an error.
    return invitation;
  }
  return db.placementInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });
}

export interface ValidatedInvitation {
  invitation: { id: string; assignmentId: string };
  assignment: { id: string; testId: string; candidateId: string };
  test: { id: string; title: string; status: string; durationSeconds: number };
}

/** Looks up an invitation by its plaintext token (hashing it first — the
 * plaintext is never used as a query value directly against anything
 * that gets logged) and enforces the ACTIVE/USED/REVOKED/EXPIRED state
 * machine. Throws a specific DomainError subclass per failure reason so
 * callers don't need to branch on `TokenValidationResult` themselves. */
export async function validateTokenAndLoad(plaintextToken: string): Promise<ValidatedInvitation> {
  const tokenHash = hashInvitationToken(plaintextToken);
  const invitation = await db.placementInvitation.findUnique({
    where: { tokenHash },
    include: { assignment: { include: { test: true } } },
  });

  const record: InvitationRecordForValidation | null = invitation
    ? {
        id: invitation.id,
        assignmentId: invitation.assignmentId,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      }
    : null;

  const result = validateInvitation(record, new Date());
  if (!result.valid) {
    switch (result.reason) {
      case "NOT_FOUND":
        throw new InvitationNotFoundError();
      case "REVOKED":
        throw new InvitationRevokedError();
      case "ALREADY_USED":
        throw new InvitationUsedError();
      case "EXPIRED":
        throw new InvitationExpiredError();
    }
  }

  // Non-null because `result.valid` implies `invitation` was found.
  const loaded = invitation!;
  return {
    invitation: { id: loaded.id, assignmentId: loaded.assignmentId },
    assignment: {
      id: loaded.assignment.id,
      testId: loaded.assignment.testId,
      candidateId: loaded.assignment.candidateId,
    },
    test: {
      id: loaded.assignment.test.id,
      title: loaded.assignment.test.title,
      status: loaded.assignment.test.status,
      durationSeconds: loaded.assignment.test.durationSeconds,
    },
  };
}

export interface CandidateInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  email: string | null;
}

/** The candidate row behind an assignment is created by an Admin (see
 * /docs/DATABASE.md), but as of Phase 2J an Admin creating one for a new
 * candidate no longer supplies personal details up front — this is where
 * the candidate provides them for the first time (`profileCompletedAt`
 * was null), completing that placeholder row in place. It's also still
 * used for an existing/already-complete candidate correcting a mistake,
 * unchanged from Phase 2A — either way this UPDATES the one candidate row
 * already linked to the assignment; it never creates a second one, and
 * PlacementFlow only routes an ALREADY-complete candidate here at all if
 * they choose to revisit it. Token-authorized, same security model as
 * every other student-facing operation: the token proves the caller may
 * act on THIS assignment's candidate, nothing more (never an arbitrary
 * candidateId from the client). Allowed any time the invitation is still
 * ACTIVE — see /docs/PHASE_2A.md ("Candidate confirmation step") for why
 * this doesn't also gate on attempt state. */
export async function updateCandidateForToken(
  plaintextToken: string,
  input: z.infer<typeof candidateInputSchema>
): Promise<CandidateInfo> {
  const data = candidateInputSchema.parse(input);
  const { assignment } = await validateTokenAndLoad(plaintextToken);

  const candidate = await db.candidate.update({
    where: { id: assignment.candidateId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      age: data.age,
      email: data.email ?? null,
      // Marks the candidate's own profile complete — idempotent (safe to
      // call again on an already-complete candidate, e.g. an existing
      // candidate editing their details before starting) and never
      // creates a second candidate row; it always updates the one
      // already linked to this assignment (see the function doc above).
      profileCompletedAt: new Date(),
    },
  });

  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    phoneNumber: candidate.phoneNumber,
    age: candidate.age,
    email: candidate.email,
  };
}

function toIssuedInvitation(
  invitation: { id: string; assignmentId: string; createdAt: Date },
  plaintextToken: string
): IssuedInvitation {
  return {
    invitationId: invitation.id,
    assignmentId: invitation.assignmentId,
    plaintextToken,
    status: "ACTIVE",
    createdAt: invitation.createdAt,
  };
}
