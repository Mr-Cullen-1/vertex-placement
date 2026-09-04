"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, DownloadIcon, XCircleIcon } from "lucide-react";
import {
  confirmLanguageHubImportAction,
  previewLanguageHubImportAction,
} from "@/server/actions/import-actions";
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
import { Skeleton } from "@/components/ui/skeleton";

type PreviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      alreadyImported: boolean;
      existingTestId: string | null;
      isImportable: boolean;
      issues: { questionOrder: number | null; message: string; severity: string }[];
      questionCount: number;
      testTitle: string;
      durationSeconds: number;
      firstQuestions: { order: number; prompt: string; options: { text: string; isCorrect: boolean }[] }[];
    };

const BAND_RANGES: { label: string; range: string }[] = [
  { label: "Beginner", range: "Q1–6" },
  { label: "Elementary", range: "Q7–20" },
  { label: "Pre-Intermediate", range: "Q21–34" },
  { label: "Intermediate", range: "Q35–48" },
  { label: "Upper Intermediate", range: "Q49–62" },
  { label: "Advanced", range: "Q63–70" },
];

/** One-time, single-source import — Super Admin only. There is no file
 * picker: the verified Language Hub question set is server-side data
 * (see /docs/PHASE_2D.md "Import architecture"), not something uploaded
 * through this UI. */
export function ImportLanguageHubDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function loadPreview() {
    setPreview({ status: "loading" });
    const result = await previewLanguageHubImportAction();
    if (!result.ok) {
      setPreview({ status: "error", message: result.message });
      return;
    }
    setPreview({
      status: "ready",
      alreadyImported: result.data.alreadyImported,
      existingTestId: result.data.existingTestId,
      isImportable: result.data.isImportable,
      issues: result.data.issues,
      questionCount: result.data.questions.length,
      testTitle: result.data.testTitle,
      durationSeconds: result.data.durationSeconds,
      firstQuestions: result.data.questions.slice(0, 3).map((q) => ({
        order: q.order,
        prompt: q.prompt,
        options: q.options,
      })),
    });
  }

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError(null);
    const result = await confirmLanguageHubImportAction();
    setConfirming(false);
    if (!result.ok) {
      setConfirmError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
    router.push(`/admin/tests/${result.data.testId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirmError(null);
        if (next) loadPreview();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <DownloadIcon />
        Import Language Hub test
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import the Language Hub placement test</DialogTitle>
          <DialogDescription>
            70 questions, Macmillan Education, 2019. Imports as a DRAFT test — nothing is
            published automatically.
          </DialogDescription>
        </DialogHeader>

        {preview.status === "loading" && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {preview.status === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {preview.message}
          </p>
        )}

        {preview.status === "ready" && preview.alreadyImported && (
          <div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <p className="text-foreground">
              This test has already been imported — re-importing would create a duplicate.
            </p>
            {preview.existingTestId && (
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                nativeButton={false}
                render={<a href={`/admin/tests/${preview.existingTestId}`} />}
              >
                Open the existing test
              </Button>
            )}
          </div>
        )}

        {preview.status === "ready" && !preview.alreadyImported && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Title" value={preview.testTitle} wide />
              <Stat label="Duration" value={`${preview.durationSeconds / 60} min`} />
              <Stat label="Questions" value={String(preview.questionCount)} />
            </dl>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Source progression bands</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                {BAND_RANGES.map((b) => (
                  <li key={b.label}>
                    {b.label} <span className="text-foreground/70">({b.range})</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">First questions</p>
              <ul className="flex flex-col gap-2">
                {preview.firstQuestions.map((q) => (
                  <li key={q.order} className="rounded-lg bg-muted/50 p-2 text-xs">
                    <p className="font-medium text-foreground">
                      Q{q.order}. {q.prompt.split("\n")[0]}
                    </p>
                    <p className="text-muted-foreground">{q.options.length} options</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {preview.isImportable ? (
                <>
                  <CheckCircle2Icon className="size-4 text-success" />
                  <span className="text-success">Validation passed — ready to import.</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="size-4 text-destructive" />
                  <span className="text-destructive">Validation failed — cannot import.</span>
                </>
              )}
            </div>
            {preview.issues.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                {preview.issues.slice(0, 10).map((issue, i) => (
                  <li key={i}>
                    {issue.questionOrder !== null ? `Q${issue.questionOrder}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}

            {confirmError && (
              <p role="alert" className="text-sm text-destructive">
                {confirmError}
              </p>
            )}

            <DialogFooter>
              <Button
                onClick={handleConfirm}
                disabled={!preview.isImportable || confirming}
              >
                {confirming ? "Importing…" : "Confirm import"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex flex-col gap-0.5 sm:col-span-4" : "flex flex-col gap-0.5"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
