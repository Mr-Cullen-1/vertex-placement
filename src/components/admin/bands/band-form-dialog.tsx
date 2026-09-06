"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import { createPlacementBandAction, updatePlacementBandAction } from "@/server/actions/band-actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ScoringMode = "PERCENTAGE" | "RAW_SCORE";

interface BandDraft {
  id: string;
  order: number;
  label: string;
  scoringMode: ScoringMode;
  minPercentage: number | null;
  maxPercentage: number | null;
  minRawScore: number | null;
  maxRawScore: number | null;
  description: string | null;
}

/** Create-or-edit dialog for one PlacementBand. `order` is a plain
 * editable number, not auto-managed — bands are few and the admin owns
 * the evaluation sequence directly (lowest band first). No CEFR cutoffs
 * are pre-filled; every value is whatever the org enters. */
export function BandFormDialog({
  testId,
  nextOrder,
  band,
}: {
  testId: string;
  nextOrder?: number;
  band?: BandDraft;
}) {
  const mode = band ? "edit" : "create";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>(band?.scoringMode ?? "PERCENTAGE");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const description = String(formData.get("description") ?? "").trim();
    const input =
      scoringMode === "RAW_SCORE"
        ? {
            order: Number(formData.get("order")),
            label: String(formData.get("label") ?? ""),
            scoringMode: "RAW_SCORE" as const,
            minRawScore: Number(formData.get("minRawScore")),
            maxRawScore: Number(formData.get("maxRawScore")),
            description: description === "" ? null : description,
          }
        : {
            order: Number(formData.get("order")),
            label: String(formData.get("label") ?? ""),
            scoringMode: "PERCENTAGE" as const,
            minPercentage: Number(formData.get("minPercentage")),
            maxPercentage: Number(formData.get("maxPercentage")),
            description: description === "" ? null : description,
          };

    const result =
      mode === "create"
        ? await createPlacementBandAction(testId, input)
        : await updatePlacementBandAction(band!.id, input);

    setSubmitting(false);
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
      {mode === "create" ? (
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <PlusIcon />
          Add band
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit band" />}>
          <PencilIcon />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New placement band" : "Edit placement band"}</DialogTitle>
          <DialogDescription>
            Whatever label and score range the organization decides — this is configuration, not
            an official standard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`band-label-${mode}`}>Label</Label>
            <Input
              id={`band-label-${mode}`}
              name="label"
              required
              maxLength={100}
              defaultValue={band?.label}
              placeholder="e.g. Upper Intermediate"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`band-scoring-mode-${mode}`}>Evaluated against</Label>
            <Select
              id={`band-scoring-mode-${mode}`}
              value={scoringMode}
              onChange={(e) => setScoringMode(e.target.value as ScoringMode)}
            >
              <option value="PERCENTAGE">Percentage of total questions</option>
              <option value="RAW_SCORE">Total correct answers (raw score)</option>
            </Select>
          </div>
          {scoringMode === "RAW_SCORE" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`band-min-raw-${mode}`}>Min correct</Label>
                <Input
                  id={`band-min-raw-${mode}`}
                  name="minRawScore"
                  type="number"
                  min={0}
                  step="1"
                  required
                  defaultValue={band?.minRawScore ?? undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`band-max-raw-${mode}`}>Max correct</Label>
                <Input
                  id={`band-max-raw-${mode}`}
                  name="maxRawScore"
                  type="number"
                  min={0}
                  step="1"
                  required
                  defaultValue={band?.maxRawScore ?? undefined}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`band-min-${mode}`}>Min %</Label>
                <Input
                  id={`band-min-${mode}`}
                  name="minPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  required
                  defaultValue={band?.minPercentage ?? undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`band-max-${mode}`}>Max %</Label>
                <Input
                  id={`band-max-${mode}`}
                  name="maxPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  required
                  defaultValue={band?.maxPercentage ?? undefined}
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`band-order-${mode}`}>Order (lowest band first)</Label>
            <Input
              id={`band-order-${mode}`}
              name="order"
              type="number"
              min={0}
              required
              defaultValue={band?.order ?? nextOrder ?? 0}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`band-description-${mode}`}>Description (optional)</Label>
            <Textarea
              id={`band-description-${mode}`}
              name="description"
              maxLength={1000}
              rows={2}
              defaultValue={band?.description ?? ""}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "create" ? "Save band" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
