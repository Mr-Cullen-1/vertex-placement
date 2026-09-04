"use server";

import { getActorOrThrow } from "@/lib/actor";
import { runAction } from "@/server/actions/action-result";
import { exportPlacementWorkbook } from "@/server/services/export.service";

/** Super Admin/Admin export — enforced in the service layer
 * (`assertPermission`/`hasPermission`), not here. Server Actions can't
 * stream a file response directly, so the workbook crosses the wire as
 * base64; the client decodes it into a Blob and triggers a normal
 * browser download (see export-workbook-button.tsx) — matching this
 * app's existing "Server Actions, not a REST /api surface" convention
 * (see /docs/ROUTES.md) rather than adding a new route handler. */
export async function exportPlacementWorkbookAction() {
  return runAction(async () => {
    const actor = await getActorOrThrow();
    const { fileName, buffer } = await exportPlacementWorkbook(actor);
    return { fileName, base64: buffer.toString("base64") };
  });
}
