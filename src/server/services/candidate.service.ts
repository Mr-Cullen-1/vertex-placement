import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { CandidateNotFoundError } from "@/server/errors";
import { candidateInputSchema, type CandidateInput } from "@/domain/candidate/schema";

/**
 * Candidates never authenticate (see /docs/PRODUCT_RULES.md) — this
 * service is Admin/Super-Admin-only, used when setting up an assignment.
 * Validation shape lives in domain/candidate/schema.ts and is shared
 * with the student-facing confirmation step (invitation.service.ts) and
 * the CandidateForm client component.
 */

const createCandidateSchema = candidateInputSchema;

export type CreateCandidateInput = CandidateInput;

export async function createCandidate(actor: Actor, input: CreateCandidateInput) {
  assertPermission(actor, "assignment:write");
  const data = createCandidateSchema.parse(input);
  return db.candidate.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      age: data.age,
      email: data.email ?? null,
    },
  });
}

export async function getCandidate(actor: Actor, candidateId: string) {
  assertPermission(actor, "candidate:read");
  const candidate = await db.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new CandidateNotFoundError();
  return candidate;
}

export async function listCandidates(actor: Actor) {
  assertPermission(actor, "candidate:read");
  return db.candidate.findMany({ orderBy: { createdAt: "desc" } });
}
