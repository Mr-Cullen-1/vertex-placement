import { createConsoleEmailService } from "./console-provider";
import { createResendEmailService } from "./resend-provider";
import type { EmailService } from "./types";

export type { EmailService } from "./types";

/**
 * Provider selection: Resend if `RESEND_API_KEY` is configured,
 * otherwise the console fallback (development/test only — see
 * console-provider.ts, which refuses to run in production). Read lazily
 * (not through the strict `envSchema` in /lib/env.ts) so a deployment
 * that hasn't set up email yet doesn't fail to boot entirely — see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Public test failure states" (the same
 * "controlled unavailable, never crash" principle applied to email).
 */
let testOverride: EmailService | null = null;

/** Test-only seam — lets integration tests capture the code a real send
 * would have delivered, without hitting a real provider or touching
 * production config. Throws outside a test environment so it can never
 * become an accidental production code path. See
 * /docs/PHASE_2J_TRY_YOURSELF.md "Development email QA". */
export function __setEmailServiceForTesting(service: EmailService | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("__setEmailServiceForTesting must never be called in production.");
  }
  testOverride = service;
}

export function getEmailService(): EmailService {
  if (testOverride) return testOverride;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const from = process.env.RESEND_FROM_EMAIL || "Vertex Placement <onboarding@resend.dev>";
    return createResendEmailService(apiKey, from);
  }
  return createConsoleEmailService();
}
