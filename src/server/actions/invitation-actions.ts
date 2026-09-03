"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  generateInvitation,
  regenerateInvitation,
  revokeInvitation,
} from "@/server/services/invitation.service";

/** The plaintext token in a successful `IssuedInvitation` result is the
 * ONE time it is ever available after generation — the UI must show/copy
 * it immediately and never expect to retrieve it again (only the hash is
 * persisted). See invitation.service.ts. */

export async function generateInvitationAction(assignmentId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return generateInvitation(actor, assignmentId);
  });
}

export async function regenerateInvitationAction(assignmentId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return regenerateInvitation(actor, assignmentId);
  });
}

export async function revokeInvitationAction(invitationId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return revokeInvitation(actor, invitationId);
  });
}
