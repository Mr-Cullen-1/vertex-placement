"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import { createCandidate, type CreateCandidateInput } from "@/server/services/candidate.service";

export async function createCandidateAction(input: CreateCandidateInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createCandidate(actor, input);
  });
}
