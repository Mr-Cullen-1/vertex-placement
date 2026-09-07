"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, UserPlusIcon } from "lucide-react";
import { createAssignmentAction } from "@/server/actions/assignment-actions";
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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/select";

export interface CandidateOption {
  id: string;
  label: string;
}

export interface TestOption {
  id: string;
  title: string;
}

interface NewAssignmentDialogProps {
  candidates: CandidateOption[];
  publishedTests: TestOption[];
  initialCandidateId?: string;
  autoOpen?: boolean;
}

/**
 * Candidate + Test -> Assignment, per the operational flow in
 * /docs/PHASE_2B.md ("Assignment + invitation"). Only PUBLISHED tests are
 * offered — createAssignment rejects anything else server-side anyway
 * (assignment.service.ts), this just avoids a guaranteed-to-fail pick.
 *
 * Phase 2J: "New candidate" no longer collects any personal details here
 * — ADMIN CREATES ACCESS, the STUDENT enters their own details when they
 * open the invitation (see /docs/PRODUCT_RULES.md "Candidate ownership").
 * This removed the duplicate-data-entry problem where an admin typed a
 * candidate's name/phone/age/email, then the student was asked to
 * "confirm" the exact same fields moments later.
 */
export function NewAssignmentDialog({
  candidates,
  publishedTests,
  initialCandidateId,
  autoOpen,
}: NewAssignmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [mode, setMode] = useState<"existing" | "new">(
    initialCandidateId || candidates.length > 0 ? "existing" : "new"
  );
  const [candidateId, setCandidateId] = useState(initialCandidateId ?? candidates[0]?.id ?? "");
  const [testId, setTestId] = useState(publishedTests[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!testId) {
      setError("Select a published test.");
      return;
    }
    if (mode === "existing" && !candidateId) {
      setError("Select a candidate.");
      return;
    }

    setSubmitting(true);
    const result = await createAssignmentAction(
      mode === "existing" ? { testId, candidateId } : { testId, newCandidate: true }
    );
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.push(`/admin/assignments/${result.data.id}`);
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
        New assignment
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
          <DialogDescription>Assign a placement test to a candidate.</DialogDescription>
        </DialogHeader>

        {publishedTests.length === 0 ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            No published test is available yet. A Super Admin needs to publish one before an
            assignment can be created.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="testId">Placement test</Label>
              <Combobox
                id="testId"
                value={testId}
                onValueChange={setTestId}
                items={publishedTests.map((t) => ({ value: t.id, label: t.title }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  disabled={candidates.length === 0}
                  className={`flex-1 rounded-md py-1 font-medium transition-colors disabled:opacity-40 ${
                    mode === "existing" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Existing candidate
                </button>
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`flex-1 rounded-md py-1 font-medium transition-colors ${
                    mode === "new" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  New candidate
                </button>
              </div>

              {mode === "existing" ? (
                <Combobox
                  value={candidateId}
                  onValueChange={setCandidateId}
                  items={candidates.map((c) => ({ value: c.id, label: c.label }))}
                  aria-label="Candidate"
                />
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
                  <UserPlusIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>The student will enter their details when they open the invitation.</p>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create assignment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
