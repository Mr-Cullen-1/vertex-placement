import { EmailDeliveryError } from "@/server/errors";
import type { EmailService } from "./types";

/**
 * Production email provider — Resend (https://resend.com), reached via a
 * plain `fetch` call rather than its SDK, so this feature adds zero new
 * npm dependencies. `RESEND_API_KEY` is server-only (see /lib/env.ts —
 * intentionally NOT read into `NEXT_PUBLIC_*`) and never logged; a
 * failed send throws the generic `EmailDeliveryError`, never the raw
 * provider response, so a caller can't leak provider internals to a
 * visitor (see /docs/PHASE_2J_TRY_YOURSELF.md "Email failure states").
 */
export function createResendEmailService(apiKey: string, fromAddress: string): EmailService {
  return {
    async sendVerificationCode(to, code) {
      let response: Response;
      try {
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to,
            subject: `${code} is your Vertex Placement verification code`,
            text:
              `Your Vertex Placement verification code is ${code}.\n\n` +
              `This code expires in 10 minutes. If you didn't request this, you can ignore this email.`,
          }),
        });
      } catch {
        throw new EmailDeliveryError();
      }
      if (!response.ok) {
        throw new EmailDeliveryError();
      }
    },
  };
}
