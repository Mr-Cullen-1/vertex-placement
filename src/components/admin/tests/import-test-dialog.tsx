"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileJsonIcon,
  SparklesIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";
import {
  confirmGenericImportAction,
  confirmLanguageHubImportAction,
  previewGenericImportAction,
  previewLanguageHubImportAction,
} from "@/server/actions/import-actions";
import { MAX_IMPORT_FILE_BYTES } from "@/domain/import/validate";
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
import { cn } from "@/lib/utils";

type Source = "json" | "language-hub";

interface UnifiedPreview {
  source: Source;
  title: string;
  durationSeconds: number;
  questionCount: number;
  bandCount: number;
  fileName: string | null;
  sampleQuestions: { order: number; prompt: string; optionCount: number }[];
  issues: { questionOrder: number | null; message: string; severity: "ERROR" | "WARNING" }[];
  isImportable: boolean;
  /** Language Hub only — a hard block, re-importing the singleton dataset. */
  alreadyImported: boolean;
  existingTestId: string | null;
  /** Generic JSON only — a soft warning, still importable. */
  titleConflict: boolean;
}

type PreviewState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "ready"; preview: UnifiedPreview };

const SAMPLE_QUESTION_COUNT = 5;

/**
 * Universal test import — replaces the old Language Hub-only dialog
 * (Phase 2H). Two supported sources converge on the same preview/confirm
 * UI: the generic structured JSON format (see
 * /docs/TEST_IMPORT_FORMAT.md) and the verified, no-upload Language Hub
 * Placement Test dataset. Both go through the same normalize -> validate
 * -> preview -> confirm pipeline server-side (`import.service.ts`) — this
 * component only ever renders whichever `UnifiedPreview` comes back.
 */
export function ImportTestDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>("json");
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function reset() {
    setSource("json");
    setFile(null);
    setFileContent(null);
    setFileError(null);
    setPreview({ status: "idle" });
    setConfirmError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setPreview({ status: "idle" });
    setFile(null);
    setFileContent(null);
    setFileError(null);

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".json")) {
      setFileError("Only .json files are supported.");
      return;
    }
    if (selected.size > MAX_IMPORT_FILE_BYTES) {
      setFileError(`File is too large (max ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)}MB).`);
      return;
    }

    const text = await selected.text();
    setFile(selected);
    setFileContent(text);
  }

  async function handlePreview() {
    setPreview({ status: "loading" });

    if (source === "language-hub") {
      const result = await previewLanguageHubImportAction();
      if (!result.ok) {
        setPreview({ status: "error", message: result.message });
        return;
      }
      setPreview({
        status: "ready",
        preview: {
          source: "language-hub",
          title: result.data.testTitle,
          durationSeconds: result.data.durationSeconds,
          questionCount: result.data.questions.length,
          bandCount: 0,
          fileName: null,
          sampleQuestions: result.data.questions.slice(0, SAMPLE_QUESTION_COUNT).map((q) => ({
            order: q.order,
            prompt: q.prompt,
            optionCount: q.options.length,
          })),
          issues: result.data.issues,
          isImportable: result.data.isImportable,
          alreadyImported: result.data.alreadyImported,
          existingTestId: result.data.existingTestId,
          titleConflict: false,
        },
      });
      return;
    }

    if (!file || fileContent === null) {
      setPreview({ status: "error", message: "Choose a JSON file first." });
      return;
    }

    const result = await previewGenericImportAction(file.name, fileContent);
    if (!result.ok) {
      setPreview({ status: "error", message: result.message });
      return;
    }
    setPreview({
      status: "ready",
      preview: {
        source: "json",
        title: result.data.title,
        durationSeconds: result.data.durationSeconds,
        questionCount: result.data.questions.length,
        bandCount: result.data.bandCount,
        fileName: result.data.fileName,
        sampleQuestions: result.data.questions.slice(0, SAMPLE_QUESTION_COUNT).map((q) => ({
          order: q.order,
          prompt: q.prompt,
          optionCount: q.options.length,
        })),
        issues: result.data.issues,
        isImportable: result.data.isImportable,
        alreadyImported: false,
        existingTestId: null,
        titleConflict: result.data.titleConflict,
      },
    });
  }

  async function handleConfirm() {
    if (preview.status !== "ready") return;
    setConfirming(true);
    setConfirmError(null);

    const result =
      preview.preview.source === "language-hub"
        ? await confirmLanguageHubImportAction()
        : file && fileContent !== null
          ? await confirmGenericImportAction(file.name, fileContent)
          : { ok: false as const, code: "MISSING_FILE", message: "The selected file is no longer available — reselect it." };

    setConfirming(false);
    if (!result.ok) {
      setConfirmError(result.message);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
    router.push(`/admin/tests/${result.data.testId}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <DownloadIcon />
        Import
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import a placement test</DialogTitle>
          <DialogDescription>
            Parse, review, and validate a test before anything is created. Imports as a DRAFT
            test — nothing is published automatically.
          </DialogDescription>
        </DialogHeader>

        {preview.status !== "ready" ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <SourceOption
                icon={FileJsonIcon}
                title="Upload a JSON file"
                description="Your own structured test file"
                selected={source === "json"}
                onSelect={() => {
                  setSource("json");
                  setPreview({ status: "idle" });
                }}
              />
              <SourceOption
                icon={SparklesIcon}
                title="Language Hub"
                description="Verified 70-question dataset"
                selected={source === "language-hub"}
                onSelect={() => {
                  setSource("language-hub");
                  setPreview({ status: "idle" });
                }}
              />
            </div>

            {source === "json" && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="import-file"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <UploadIcon className="size-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {file ? file.name : "Choose a .json file"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `Max ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)}MB`}
                  </span>
                  <input
                    ref={fileInputRef}
                    id="import-file"
                    type="file"
                    accept=".json,application/json"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                {fileError && (
                  <p role="alert" className="text-sm text-destructive">
                    {fileError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  See <span className="font-medium text-foreground">docs/TEST_IMPORT_FORMAT.md</span>{" "}
                  in the repository for the expected file structure and a full example.
                </p>
              </div>
            )}

            {preview.status === "error" && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {preview.message}
              </p>
            )}

            <DialogFooter>
              <Button
                onClick={handlePreview}
                disabled={preview.status === "loading" || (source === "json" && (!file || Boolean(fileError)))}
              >
                {preview.status === "loading" ? "Parsing…" : "Preview"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <PreviewPanel
            preview={preview.preview}
            confirming={confirming}
            confirmError={confirmError}
            onBack={() => setPreview({ status: "idle" })}
            onConfirm={handleConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SourceOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: typeof FileJsonIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors duration-150",
        selected
          ? "border-primary/40 bg-primary-soft ring-1 ring-primary/25"
          : "border-border bg-card hover:bg-muted/40"
      )}
    >
      <span className={cn("flex size-8 items-center justify-center rounded-lg", selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="size-4" />
      </span>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function PreviewPanel({
  preview,
  confirming,
  confirmError,
  onBack,
  onConfirm,
}: {
  preview: UnifiedPreview;
  confirming: boolean;
  confirmError: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const errorIssues = preview.issues.filter((i) => i.severity === "ERROR");
  const warningIssues = preview.issues.filter((i) => i.severity === "WARNING");

  return (
    <div className="flex flex-col gap-4">
      {preview.alreadyImported ? (
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
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewStat label="Title" value={preview.title} wide />
            <PreviewStat label="Duration" value={`${Math.round(preview.durationSeconds / 60)} min`} />
            <PreviewStat label="Questions" value={String(preview.questionCount)} />
            <PreviewStat label="Bands" value={String(preview.bandCount)} />
          </dl>

          {preview.titleConflict && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground ring-1 ring-warning/25">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <p>
                A test titled &quot;{preview.title}&quot; already exists. Confirming will create a
                separate, additional test — it will not modify or replace the existing one.
              </p>
            </div>
          )}

          {preview.sampleQuestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                First {preview.sampleQuestions.length} questions
              </p>
              <ul className="flex flex-col gap-2">
                {preview.sampleQuestions.map((q, index) => (
                  // Index, not q.order — a still-invalid preview (e.g.
                  // duplicate order numbers, exactly what this panel is
                  // warning about) must not produce duplicate React keys.
                  <li key={index} className="rounded-lg bg-muted/50 p-2 text-xs">
                    <p className="font-medium text-foreground">
                      Q{q.order}. {q.prompt.split("\n")[0]}
                    </p>
                    <p className="text-muted-foreground">{q.optionCount} options</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

          {errorIssues.length > 0 && (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
              {errorIssues.slice(0, 20).map((issue, i) => (
                <li key={i}>
                  {issue.questionOrder !== null ? `Q${issue.questionOrder}: ` : ""}
                  {issue.message}
                </li>
              ))}
              {errorIssues.length > 20 && <li>…and {errorIssues.length - 20} more.</li>}
            </ul>
          )}
          {warningIssues.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg bg-warning/10 p-2 text-xs text-warning-foreground">
              {warningIssues.map((issue, i) => (
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
            <Button variant="outline" onClick={onBack} disabled={confirming}>
              Back
            </Button>
            <Button onClick={onConfirm} disabled={!preview.isImportable || confirming}>
              {confirming ? "Importing…" : "Confirm import"}
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  );
}

function PreviewStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 flex flex-col gap-0.5 sm:col-span-4" : "flex flex-col gap-0.5"}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
