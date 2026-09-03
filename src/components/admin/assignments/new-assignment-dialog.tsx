"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { candidateInputSchema, type CandidateInput } from "@/domain/candidate/schema";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface CandidateOption {
  id: string;
  label: string;
}

export interface TestOption {
  id: string;
  title: string;
}

type RawCandidateValues = { firstName: string; lastName: string; phoneNumber: string; age: string; email: string };
const EMPTY_CANDIDATE: RawCandidateValues = { firstName: "", lastName: "", phoneNumber: "", age: "", email: "" };

interface NewAssignmentDialogProps {
  candidates: CandidateOption[];
  publishedTests: TestOption[];
  initialCandidateId?: string;
  autoOpen?: boolean;
}

/** Candidate + Test -> Assignment, per the operational flow in
 * /docs/PHASE_2B.md ("Assignment + invitation"). Only PUBLISHED tests are
 * offered — createAssignment rejects anything else server-side anyway
 * (assignment.service.ts), this just avoids a guaranteed-to-fail pick. */
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
  const [newCandidate, setNewCandidate] = useState<RawCandidateValues>(EMPTY_CANDIDATE);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RawCandidateValues, string>>>({});
  const [testId, setTestId] = useState(publishedTests[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateNewCandidate<K extends keyof RawCandidateValues>(key: K, value: string) {
    setNewCandidate((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!testId) {
      setError("Select a published test.");
      return;
    }

    let candidatePayload: { candidateId: string } | { candidate: CandidateInput };
    if (mode === "existing") {
      if (!candidateId) {
        setError("Select a candidate.");
        return;
      }
      candidatePayload = { candidateId };
    } else {
      const parsed = candidateInputSchema.safeParse({
        firstName: newCandidate.firstName,
        lastName: newCandidate.lastName,
        phoneNumber: newCandidate.phoneNumber,
        age: newCandidate.age as unknown as number,
        email: newCandidate.email.trim() === "" ? undefined : newCandidate.email,
      });
      if (!parsed.success) {
        const errors: Partial<Record<keyof RawCandidateValues, string>> = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof RawCandidateValues | undefined;
          if (key && !errors[key]) errors[key] = issue.message;
        }
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      candidatePayload = { candidate: parsed.data };
    }

    setSubmitting(true);
    const result = await createAssignmentAction({ testId, ...candidatePayload });
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
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="testId">Placement test</Label>
              <Select id="testId" value={testId} onChange={(e) => setTestId(e.target.value)}>
                {publishedTests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </Select>
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
                <Select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} aria-label="Candidate">
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="firstName"
                      label="First name"
                      value={newCandidate.firstName}
                      error={fieldErrors.firstName}
                      onChange={(v) => updateNewCandidate("firstName", v)}
                    />
                    <Field
                      id="lastName"
                      label="Last name"
                      value={newCandidate.lastName}
                      error={fieldErrors.lastName}
                      onChange={(v) => updateNewCandidate("lastName", v)}
                    />
                  </div>
                  <Field
                    id="phoneNumber"
                    label="Phone number"
                    value={newCandidate.phoneNumber}
                    error={fieldErrors.phoneNumber}
                    onChange={(v) => updateNewCandidate("phoneNumber", v)}
                    type="tel"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="age"
                      label="Age"
                      value={newCandidate.age}
                      error={fieldErrors.age}
                      onChange={(v) => updateNewCandidate("age", v)}
                      type="number"
                    />
                    <Field
                      id="email"
                      label="Email (optional)"
                      value={newCandidate.email}
                      error={fieldErrors.email}
                      onChange={(v) => updateNewCandidate("email", v)}
                      type="email"
                    />
                  </div>
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

interface FieldProps {
  id: keyof RawCandidateValues;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
}

function Field({ id, label, value, error, onChange, type = "text" }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
