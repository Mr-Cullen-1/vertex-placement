"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import {
  confirmGenericImport,
  confirmLanguageHubImport,
  previewGenericImport,
  previewLanguageHubImport,
} from "@/server/services/import.service";

/** Super Admin-only Server Actions for test import — enforced in the
 * service layer (`assertPermission`), not here. Covers both the
 * verified, no-upload Language Hub source and the generic JSON upload
 * pipeline (Phase 2H); both go through the same `runAction` result
 * shape so the dialog handles them identically. */

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

/** `fileContent` is the raw file text, read client-side via `file.text()`
 * — this action never receives a File/Blob, matching the app's existing
 * plain-argument Server Action convention. */
export async function previewGenericImportAction(fileName: string, fileContent: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return previewGenericImport(actor, fileName, fileContent);
  });
}

export async function confirmGenericImportAction(fileName: string, fileContent: string) {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    return confirmGenericImport(actor, fileName, fileContent);
  });
}
