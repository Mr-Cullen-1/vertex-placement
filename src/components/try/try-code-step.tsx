"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OnboardingShell } from "@/components/shared/onboarding-shell";
import { requestCodeAction, verifyCodeAction, switchToAnotherEmailAction } from "@/server/actions/self-serve-actions";

const RESEND_COOLDOWN_SECONDS = 60;

/** Passwordless verification, step 2 — a 6-digit one-time code (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Passwordless verification"). The
 * resend cooldown shown here is a UX courtesy only; the server enforces
 * the real cooldown independently (self-serve.service.ts) regardless of
 * what this component's timer allows. */
export function TryCodeStep({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await verifyCodeAction(email, code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onVerified();
  }

  async function handleResend() {
    setError(null);
    setResending(true);
    const result = await requestCodeAction(email);
    setResending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleSwitchEmail() {
    await switchToAnotherEmailAction();
    window.location.reload();
  }

  return (
    <OnboardingShell step="verify">
      <div className="flex w-full max-w-md animate-page-in flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Enter your code</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
          <Input
            id="try-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-invalid={Boolean(error)}
            className="h-12 text-center text-2xl font-semibold tracking-[0.4em]"
            placeholder="000000"
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="h-11 text-base" disabled={submitting || code.length !== 6}>
            {submitting ? "Verifying…" : "Verify"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {resending ? "Resending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={handleSwitchEmail}
            className="underline-offset-4 hover:underline"
          >
            Use another email
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
