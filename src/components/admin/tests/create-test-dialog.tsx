"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { createPlacementTestAction } from "@/server/actions/test-actions";
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
import { Textarea } from "@/components/ui/textarea";

/** Super Admin only — creates a DRAFT test shell (title, duration,
 * intended question count). Question authoring/import is a later phase
 * (see /docs/PHASE_2B.md "Known limitations"); a freshly created test
 * has no questions yet and cannot be published until some exist. */
export function CreateTestDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const durationMinutes = Number(formData.get("durationMinutes"));
    const totalQuestionCount = Number(formData.get("totalQuestionCount"));
    const description = String(formData.get("description") ?? "").trim();
    const sourceAttribution = String(formData.get("sourceAttribution") ?? "").trim();

    const result = await createPlacementTestAction({
      title: String(formData.get("title") ?? ""),
      description: description === "" ? null : description,
      sourceAttribution: sourceAttribution === "" ? null : sourceAttribution,
      durationSeconds: Math.round(durationMinutes * 60),
      totalQuestionCount,
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
    router.push(`/admin/tests/${result.data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        New test
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New placement test</DialogTitle>
          <DialogDescription>
            Creates a draft test shell. Questions are added separately (import
            pipeline) — this only sets up the test&apos;s identity and rules.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={200} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" maxLength={2000} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sourceAttribution">Source attribution (optional)</Label>
            <Input id="sourceAttribution" name="sourceAttribution" maxLength={500} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={1}
                max={1440}
                defaultValue={30}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totalQuestionCount">Question count</Label>
              <Input
                id="totalQuestionCount"
                name="totalQuestionCount"
                type="number"
                min={1}
                max={1000}
                defaultValue={70}
                required
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
