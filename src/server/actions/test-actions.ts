"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  archivePlacementTest,
  createPlacementTest,
  publishPlacementTest,
  updatePlacementTest,
  type CreateTestInput,
  type UpdateTestInput,
} from "@/server/services/placement-test.service";

/** Admin-facing Server Actions for PlacementTest lifecycle. Super Admin
 * only — enforced in the service layer (`assertPermission`), not here;
 * these are thin wrappers that resolve the actor from the session and
 * shape the result for client components (see action-result.ts). */

export async function createPlacementTestAction(input: CreateTestInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createPlacementTest(actor, input);
  });
}

export async function updatePlacementTestAction(testId: string, input: UpdateTestInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return updatePlacementTest(actor, testId, input);
  });
}

export async function publishPlacementTestAction(testId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return publishPlacementTest(actor, testId);
  });
}

export async function archivePlacementTestAction(testId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return archivePlacementTest(actor, testId);
  });
}
