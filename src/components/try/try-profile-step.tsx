"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { VertexWordmark } from "@/components/placement/vertex-mark";
import { updateSelfServeProfileAction } from "@/server/actions/self-serve-actions";

type RawValues = { firstName: string; lastName: string; phoneNumber: string; age: string };

/** Personal details, collected AFTER email verification (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Personal details") — the verified
 * email itself is shown read-only, never re-entered or editable here. */
export function TryProfileStep({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const [values, setValues] = useState<RawValues>({ firstName: "", lastName: "", phoneNumber: "", age: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RawValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof RawValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const errors: Partial<Record<keyof RawValues, string>> = {};
    if (!values.firstName.trim()) errors.firstName = "First name is required";
    if (!values.lastName.trim()) errors.lastName = "Last name is required";
    if (!values.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
    const age = Number(values.age);
    if (!values.age.trim() || !Number.isInteger(age) || age < 1 || age > 120) {
      errors.age = "Enter a valid age";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const result = await updateSelfServeProfileAction({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber.trim(),
      age,
    });
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    onSuccess();
  }

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-md animate-page-in flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tell us about yourself</h1>
            <p className="text-sm text-muted-foreground">
              Enter your details before starting the placement test.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="truncate text-sm font-medium text-foreground" title={email}>
              {email}
            </span>
          </div>
          <Badge variant="success" className="shrink-0">
            Verified
          </Badge>
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

          <Field
            id="age"
            label="Age"
            value={values.age}
            error={fieldErrors.age}
            onChange={(v) => update("age", v)}
            type="number"
            inputMode="numeric"
          />

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
