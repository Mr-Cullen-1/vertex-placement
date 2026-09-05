import type { EmailService } from "./types";

/**
 * Development-only fallback used when no real provider is configured
 * (no `RESEND_API_KEY`) — logs the code to the SERVER console only, so
 * local development and manual QA don't require a real inbox. Never
 * reachable in production: constructing it outside development throws,
 * so this can't silently become the effective provider in a
 * misconfigured deployment (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Development email QA" — codes must never reach production UI/logs).
 */
export function createConsoleEmailService(): EmailService {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The console email provider must never be used in production. Configure RESEND_API_KEY."
    );
  }
  return {
    async sendVerificationCode(to, code) {
      console.log(`[dev-email] Verification code for ${to}: ${code} (expires in 10 minutes)`);
    },
  };
}
