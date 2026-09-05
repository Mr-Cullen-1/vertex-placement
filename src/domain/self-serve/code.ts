import { randomInt, createHash } from "node:crypto";

/**
 * Pure verification-code logic — no Prisma, no Next.js. Mirrors
 * `domain/tokens/token.ts`'s hash-before-storage model exactly: the
 * plaintext 6-digit code is generated here, handed to the email service
 * exactly once, and never persisted — only its SHA-256 hash is (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Verification code security").
 */

const CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_VERIFICATION_ATTEMPTS = 5;

export interface GeneratedVerificationCode {
  /** The value emailed to the visitor. Exists only in memory. */
  plaintext: string;
  /** What actually gets stored (`PublicVerificationCode.codeHash`). */
  hash: string;
}

/** `randomInt` is a CSPRNG (Node's crypto module), not `Math.random()` —
 * required for a secret that gates account/quota access. */
export function generateVerificationCode(): GeneratedVerificationCode {
  const plaintext = randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
  return { plaintext, hash: hashVerificationCode(plaintext) };
}

export function hashVerificationCode(plaintextCode: string): string {
  return createHash("sha256").update(plaintextCode).digest("hex");
}
