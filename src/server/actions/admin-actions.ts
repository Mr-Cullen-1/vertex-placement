"use server";

import { getActorOrThrow } from "@/lib/actor";
import { createPlacementTest, type CreateTestInput } from "@/server/services/placement-test.service";
import {
  createAssignment,
  type CreateAssignmentInput,
} from "@/server/services/assignment.service";
import {
  generateInvitation,
  regenerateInvitation,
  revokeInvitation,
} from "@/server/services/invitation.service";

/**
 * Thin Server Action wiring for a handful of admin operations, proving
 * end-to-end that authorization is enforced server-side (not just by
 * hiding UI elements — see /docs/PRODUCT_RULES.md "Admin cannot..."). No
 * admin dashboard page calls these yet (Phase 2); each resolves the
 * actor from the session itself via `getActorOrThrow`, so a caller can
 * never supply their own role.
 */

export async function createPlacementTestAction(input: CreateTestInput) {
  const actor = await getActorOrThrow();
  return createPlacementTest(actor, input);
}

export async function createAssignmentAction(input: CreateAssignmentInput) {
  const actor = await getActorOrThrow();
  return createAssignment(actor, input);
}

export async function generateInvitationAction(assignmentId: string) {
  const actor = await getActorOrThrow();
  return generateInvitation(actor, assignmentId);
}

export async function regenerateInvitationAction(assignmentId: string) {
  const actor = await getActorOrThrow();
  return regenerateInvitation(actor, assignmentId);
}

export async function revokeInvitationAction(invitationId: string) {
  const actor = await getActorOrThrow();
  return revokeInvitation(actor, invitationId);
}
