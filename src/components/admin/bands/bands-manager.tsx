"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { deletePlacementBandAction } from "@/server/actions/band-actions";
import { BandFormDialog } from "@/components/admin/bands/band-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Band {
  id: string;
  order: number;
  label: string;
  minPercentage: number;
  maxPercentage: number;
  description: string | null;
}

/** Editable PlacementBand list — Super Admin only. Locked once the test
 * is ARCHIVED (mirrors placement-band.service.ts's own guard, which
 * still re-checks this server-side regardless of what's rendered here).
 * Bands may be tuned even after PUBLISH — institutional scoring rules
 * can evolve without unpublishing, per /docs/PRODUCT_RULES.md. */
export function BandsManager({
  testId,
  bands,
  locked,
}: {
  testId: string;
  bands: Band[];
  locked: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {bands.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No scoring bands configured — results will show a raw score without a level label.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bands.map((band) => (
            <li key={band.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-foreground">{band.label}</span>
                {band.description && (
                  <span className="truncate text-xs text-muted-foreground">{band.description}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-muted-foreground">
                  {band.minPercentage}–{band.maxPercentage}%
                </span>
                {!locked && (
                  <>
                    <BandFormDialog testId={testId} band={band} />
                    <DeleteBandDialog bandId={band.id} label={band.label} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!locked && <BandFormDialog testId={testId} nextOrder={bands.length} />}
      {locked && (
        <p className="text-xs text-muted-foreground">
          This test is archived — scoring bands can no longer be modified.
        </p>
      )}
    </div>
  );
}

function DeleteBandDialog({ bandId, label }: { bandId: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deletePlacementBandAction(bandId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Delete ${label}`} />}>
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &quot;{label}&quot;?</DialogTitle>
          <DialogDescription>
            Existing results that were placed in this band lose that level label (their raw
            score and percentage are unaffected). This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete band"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
