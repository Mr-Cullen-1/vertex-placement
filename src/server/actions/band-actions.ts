"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  createPlacementBand,
  deletePlacementBand,
  updatePlacementBand,
  type CreateBandInput,
  type UpdateBandInput,
} from "@/server/services/placement-band.service";

/** Super Admin-only Server Actions for PlacementBand configuration —
 * enforced in the service layer (`assertPermission`), not here. */

export async function createPlacementBandAction(testId: string, input: CreateBandInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return createPlacementBand(actor, testId, input);
  });
}

export async function updatePlacementBandAction(bandId: string, input: UpdateBandInput) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return updatePlacementBand(actor, bandId, input);
  });
}

export async function deletePlacementBandAction(bandId: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return deletePlacementBand(actor, bandId);
  });
}
