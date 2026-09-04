"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  confirmLanguageHubImport,
  previewLanguageHubImport,
} from "@/server/services/import.service";

/** Super Admin-only Server Actions for the Language Hub placement test
 * import — enforced in the service layer (`assertPermission`), not here. */

export async function previewLanguageHubImportAction() {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return previewLanguageHubImport(actor);
  });
}

export async function confirmLanguageHubImportAction() {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return confirmLanguageHubImport(actor);
  });
}
