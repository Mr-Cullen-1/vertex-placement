import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { CandidateNotFoundError } from "@/server/errors";

/**
 * Candidates never authenticate (see /docs/PRODUCT_RULES.md) — this
 * service is Admin/Super-Admin-only, used when setting up an assignment.
 */

const createCandidateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phoneNumber: z.string().trim().min(1).max(30),
  age: z.number().int().min(1).max(120),
  email: z.email().max(255).optional().nullable(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

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
