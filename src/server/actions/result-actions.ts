"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import { setFinalPlacement } from "@/server/services/attempt.service";

/** Phase 2L — Admin/Super-Admin Server Action for the Final Placement
 * override. RBAC (`result:write`) is enforced in the service layer, not
 * here. `label: null` clears an existing override. */
export async function setFinalPlacementAction(attemptId: string, label: string | null) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    await setFinalPlacement(actor, attemptId, label);
  });
}
