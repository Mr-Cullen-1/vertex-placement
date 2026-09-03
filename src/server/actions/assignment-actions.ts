"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import { createAssignment, type CreateAssignmentInput } from "@/server/services/assignment.service";

export async function createAssignmentAction(input: CreateAssignmentInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createAssignment(actor, input);
  });
}
