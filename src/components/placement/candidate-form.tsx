"use client";

import { useState, type FormEvent } from "react";
import { candidateInputSchema, type CandidateInput } from "@/domain/candidate/schema";
import { updateCandidateAction } from "@/server/actions/attempt-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VertexWordmark } from "./vertex-mark";

interface CandidateFormProps {
  token: string;
  initial: { firstName: string; lastName: string; phoneNumber: string; age: number; email: string | null };
  onSuccess: () => void;
}

type RawValues = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: string;
  email: string;
};

/** Confirms/corrects the candidate details an Admin entered when creating
 * the assignment (see /docs/PHASE_2A.md "Candidate confirmation step" for
 * why this is an update, not a fresh creation). Validated with the same
 * Zod shape the server enforces — client-side validation is a UX
 * courtesy; the server call is the actual authority. */
export function CandidateForm({ token, initial, onSuccess }: CandidateFormProps) {
  const [values, setValues] = useState<RawValues>({
    firstName: initial.firstName,
    lastName: initial.lastName,
    phoneNumber: initial.phoneNumber,
    age: String(initial.age),
    email: initial.email ?? "",
  });
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
      age: values.age as unknown as number, // coerced by the schema below
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

    const result = await updateCandidateAction(token, parsed.data);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    onSuccess();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Confirm your details
            </h1>
            <p className="text-sm text-muted-foreground">
              Please check that your information is correct before you begin.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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

          <Button type="submit" size="lg" className="h-11 text-base" disabled={submitting}>
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
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
        className="h-10"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
