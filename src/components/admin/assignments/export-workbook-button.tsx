"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { exportPlacementWorkbookAction } from "@/server/actions/export-actions";
import { Button } from "@/components/ui/button";

/** Triggers a real browser download of the Excel workbook. The file
 * itself never touches this component's own logic — it's a base64
 * payload from the server action, decoded into a Blob here purely for
 * the download mechanics (matches this app's "Server Actions, not a
 * REST endpoint" convention — see export-actions.ts). Sheet count
 * (standard vs full) is decided entirely server-side from the actor's
 * role; this button has no role-specific branching of its own. */
export function ExportWorkbookButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    const result = await exportPlacementWorkbookAction();
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    const byteChars = atob(result.data.base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
        <DownloadIcon />
        {pending ? "Exporting…" : "Export workbook"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
