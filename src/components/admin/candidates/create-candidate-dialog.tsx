"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { candidateInputSchema, type CandidateInput } from "@/domain/candidate/schema";
import { createCandidateAction } from "@/server/actions/candidate-actions";
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

type RawValues = { firstName: string; lastName: string; phoneNumber: string; age: string; email: string };
const EMPTY: RawValues = { firstName: "", lastName: "", phoneNumber: "", age: "", email: "" };

/** Reuses the same `candidateInputSchema` the student-facing confirmation
 * step validates against (src/domain/candidate/schema.ts) — one
 * validation shape, not duplicated per form (see /docs/PHASE_2B.md
 * "Create candidate"). */
export function CreateCandidateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<RawValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RawValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof RawValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const candidate: CandidateInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber,
      age: values.age as unknown as number,
      email: values.email.trim() === "" ? undefined : values.email,
    };

    const parsed = candidateInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errors: Partial<Record<keyof RawValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RawValues | undefined;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const result = await createCandidateAction(parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    setOpen(false);
    setValues(EMPTY);
    router.refresh();
    router.push(`/admin/candidates/${result.data.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSubmitError(null);
          setFieldErrors({});
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        New candidate
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New candidate</DialogTitle>
          <DialogDescription>Add a candidate so they can be assigned a test.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="firstName"
              label="First name"
              value={values.firstName}
              error={fieldErrors.firstName}
              onChange={(v) => update("firstName", v)}
              autoComplete="given-name"
            />
            <Field
              id="lastName"
              label="Last name"
              value={values.lastName}
              error={fieldErrors.lastName}
              onChange={(v) => update("lastName", v)}
              autoComplete="family-name"
            />
          </div>
          <Field
            id="phoneNumber"
            label="Phone number"
            value={values.phoneNumber}
            error={fieldErrors.phoneNumber}
            onChange={(v) => update("phoneNumber", v)}
            type="tel"
            autoComplete="tel"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="age"
              label="Age"
              value={values.age}
              error={fieldErrors.age}
              onChange={(v) => update("age", v)}
              type="number"
              inputMode="numeric"
            />
            <Field
              id="email"
              label="Email (optional)"
              value={values.email}
              error={fieldErrors.email}
              onChange={(v) => update("email", v)}
              type="email"
              autoComplete="email"
            />
          </div>
          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  id: keyof RawValues;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric";
}

function Field({ id, label, value, error, onChange, type = "text", autoComplete, inputMode }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
