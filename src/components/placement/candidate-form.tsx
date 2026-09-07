"use client";

import { useState, type FormEvent } from "react";
import { candidateInputSchema, type CandidateInput } from "@/domain/candidate/schema";
import { updateCandidateAction } from "@/server/actions/attempt-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VertexMark } from "./vertex-mark";

interface CandidateFormProps {
  token: string;
  initial: { firstName: string; lastName: string; phoneNumber: string; age: number; email: string | null };
  onSuccess: () => void;
  testTitle: string;
  durationMinutes: number;
  totalQuestions: number;
}

type RawValues = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: string;
  email: string;
};

/** The candidate provides their OWN personal details here — an Admin
 * creating an assignment for a new candidate no longer enters them (see
 * /docs/PRODUCT_RULES.md "Candidate ownership"). `PlacementFlow` only
 * ever routes here BEFORE "Ready to start" when the candidate's profile
 * is still incomplete (`candidateProfileComplete === false`) — an
 * already-complete candidate skips this entirely (see
 * /docs/DESIGN_SYSTEM.md "Student flow order"). This still calls
 * `updateCandidateAction` (an update, not a creation) — the candidate row
 * already exists, created by the Admin as a placeholder, and this call
 * completes it in place, so no duplicate candidate is ever created.
 * Validated with the same Zod shape the server enforces — client-side
 * validation is a UX courtesy; the server call is the actual authority.
 *
 * Visually composed as the same split-shell family as Admin Login/Try
 * Yourself (deep teal brand panel + light gray form workspace) rather
 * than a plain centered page — see /docs/DESIGN_SYSTEM.md "Candidate
 * form redesign". Not `OnboardingShell` itself: that component's copy
 * ("2 free completed attempts," the Email/Verify/Profile/Start stepper)
 * is specific to the public self-service wizard and would be factually
 * wrong here — an admin-invited candidate has no OTP step and no
 * self-service quota. */
export function CandidateForm({
  token,
  initial,
  onSuccess,
  testTitle,
  durationMinutes,
  totalQuestions,
}: CandidateFormProps) {
  const [values, setValues] = useState<RawValues>({
    firstName: initial.firstName,
    lastName: initial.lastName,
    phoneNumber: initial.phoneNumber,
    // `initial.age === 0` is the placeholder for "not yet provided" (see
    // /docs/PRODUCT_RULES.md "Candidate ownership") — the field must
    // start genuinely empty, not showing a literal "0" the candidate
    // would have to notice and clear themselves.
    age: initial.age > 0 ? String(initial.age) : "",
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
    <div className="flex min-h-dvh flex-col bg-background min-[900px]:flex-row">
      {/* LEFT — brand, deep teal. Compact on mobile (sizes to content,
       * not a full-height column), full-height at 900px+ — the same
       * `min-[900px]:flex-1` breakpoint pattern as Admin Login/
       * OnboardingShell. */}
      <div className="relative flex shrink-0 flex-col items-center justify-center gap-4 bg-primary px-6 py-8 text-primary-foreground min-[900px]:flex-1 min-[900px]:gap-6 min-[900px]:py-16">
        <div className="flex flex-col items-center gap-3 text-center min-[900px]:gap-5">
          <VertexMark className="size-10 min-[900px]:size-14" />
          <div className="flex flex-col gap-1 min-[900px]:gap-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-primary-foreground min-[900px]:text-2xl">
              Vertex Placement
            </h1>
            <p className="hidden text-sm text-primary-foreground/70 min-[900px]:block">
              Complete your details before starting the placement test.
            </p>
          </div>
        </div>

        <ul className="hidden flex-col items-center gap-2 min-[900px]:flex">
          <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <span aria-hidden className="size-1 rounded-full bg-primary-foreground/50" />
            {testTitle}
          </li>
          <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <span aria-hidden className="size-1 rounded-full bg-primary-foreground/50" />
            {totalQuestions} questions
          </li>
          <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <span aria-hidden className="size-1 rounded-full bg-primary-foreground/50" />
            {durationMinutes} minutes
          </li>
        </ul>
      </div>

      {/* RIGHT — form workspace, light gray canvas. */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 min-[900px]:py-16">
        <div className="flex w-full max-w-[560px] animate-page-in flex-col gap-6 rounded-2xl border border-card-border bg-card p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Tell us about yourself</h2>
            <p className="text-sm text-muted-foreground">Enter your details before starting the placement test.</p>
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

            <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={submitting}>
              {submitting ? "Saving…" : "Continue"}
            </Button>
          </form>
        </div>
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
