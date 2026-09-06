"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setFinalPlacementAction } from "@/server/actions/result-actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { STANDARD_PLACEMENT_LEVELS } from "@/domain/placement/levels";
import { formatDateTime } from "@/lib/format";
import type { FinalPlacement } from "@/domain/results/types";

/** Phase 2L — the administrative decision, edited only here (never on the
 * student-facing result screen, and never for a Try Yourself candidate —
 * see /docs/PHASE_2L_SCORING_POLICY.md "Final Placement"). Selecting
 * "Use Recommended Level" clears the override rather than merely copying
 * the current recommendation, so `isOverridden` stays accurate. */
export function FinalPlacementControl({
  attemptId,
  finalPlacement,
}: {
  attemptId: string;
  finalPlacement: FinalPlacement;
}) {
  const router = useRouter();
  const [value, setValue] = useState(finalPlacement.isOverridden ? (finalPlacement.label ?? "") : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== (finalPlacement.isOverridden ? (finalPlacement.label ?? "") : "");

  async function handleSave() {
    setPending(true);
    setError(null);
    const result = await setFinalPlacementAction(attemptId, value === "" ? null : value);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        aria-label="Final placement"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
      >
        <option value="">Use Recommended Level</option>
        {STANDARD_PLACEMENT_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </Select>
      {finalPlacement.isOverridden && finalPlacement.setAt && (
        <p className="text-xs text-muted-foreground">
          Overridden{finalPlacement.setByName ? ` by ${finalPlacement.setByName}` : ""} on{" "}
          {formatDateTime(finalPlacement.setAt)}.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {dirty && (
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save Final Placement"}
        </Button>
      )}
    </div>
  );
}
