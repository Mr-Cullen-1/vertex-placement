"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, PencilIcon, RocketIcon } from "lucide-react";
import {
  archivePlacementTestAction,
  publishPlacementTestAction,
  updatePlacementTestAction,
} from "@/server/actions/test-actions";
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

interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  sourceAttribution: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  durationSeconds: number;
}

/** Super Admin-only lifecycle controls for a single test. The parent page
 * only renders this for a Super Admin actor, but every button here still
 * calls a Server Action that re-checks permission server-side — the UI
 * gate is a convenience, not the security boundary. */
export function TestLifecycleActions({ test }: { test: TestSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {test.status === "DRAFT" && <EditTestDialog test={test} />}
      {test.status === "DRAFT" && <PublishTestButton testId={test.id} />}
      {test.status !== "ARCHIVED" && <ArchiveTestDialog testId={test.id} />}
    </div>
  );
}

function EditTestDialog({ test }: { test: TestSummary }) {
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
    const description = String(formData.get("description") ?? "").trim();
    const sourceAttribution = String(formData.get("sourceAttribution") ?? "").trim();

    const result = await updatePlacementTestAction(test.id, {
      title: String(formData.get("title") ?? ""),
      description: description === "" ? null : description,
      sourceAttribution: sourceAttribution === "" ? null : sourceAttribution,
      durationSeconds: Math.round(durationMinutes * 60),
    });

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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit test</DialogTitle>
          <DialogDescription>Only possible while the test is still a draft.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" name="title" required maxLength={200} defaultValue={test.title} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              maxLength={2000}
              rows={2}
              defaultValue={test.description ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-sourceAttribution">Source attribution</Label>
            <Input
              id="edit-sourceAttribution"
              name="sourceAttribution"
              maxLength={500}
              defaultValue={test.sourceAttribution ?? ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-durationMinutes">Duration (minutes)</Label>
            <Input
              id="edit-durationMinutes"
              name="durationMinutes"
              type="number"
              min={1}
              max={1440}
              required
              defaultValue={Math.round(test.durationSeconds / 60)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PublishTestButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setPending(true);
    setError(null);
    const result = await publishPlacementTestAction(testId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" onClick={handlePublish} disabled={pending}>
        <RocketIcon />
        {pending ? "Publishing…" : "Publish"}
      </Button>
      {error && <p className="max-w-xs text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ArchiveTestDialog({ testId }: { testId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setPending(true);
    setError(null);
    const result = await archivePlacementTestAction(testId);
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
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <ArchiveIcon />
        Archive
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Archive this test?</DialogTitle>
          <DialogDescription>
            Archiving stops new assignments from being created against it. Attempts already in
            progress are not affected. This cannot be undone from here.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleArchive} disabled={pending}>
            {pending ? "Archiving…" : "Archive test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
