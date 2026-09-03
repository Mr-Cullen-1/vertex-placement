import { randomBytes, createHash } from "node:crypto";
import type { TokenValidationFailureReason, TokenValidationResult } from "./types";

/**
 * Pure token logic — no Prisma, no Next.js. `src/server/services/invitation.service.ts`
 * wires this to persistence. See /docs/PHASE_1.md ("Security review") for
 * why the token is hashed before storage.
 */

// 256 bits of entropy, base64url-encoded (~43 chars, URL-safe, no padding).
// Not derived from candidate ID, database ID, or any other guessable
// input — pure randomness is the only source.
const TOKEN_BYTES = 32;

export interface GeneratedInvitationToken {
  /** The value to put in the student URL. Exists only in memory / in the
   * URL handed to the admin — never persisted. */
  plaintext: string;
  /** What actually gets stored (`PlacementInvitation.tokenHash`). */
  hash: string;
}

export function generateInvitationToken(): GeneratedInvitationToken {
  const plaintext = randomBytes(TOKEN_BYTES).toString("base64url");
  return { plaintext, hash: hashInvitationToken(plaintext) };
}

export function hashInvitationToken(plaintextToken: string): string {
  return createHash("sha256").update(plaintextToken).digest("hex");
}

/** Minimal shape this function needs from a fetched PlacementInvitation —
 * kept structural so callers don't have to import a Prisma type into
 * domain code. */
export interface InvitationRecordForValidation {
  id: string;
  assignmentId: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  expiresAt: Date | null;
}

export function validateInvitation(
  invitation: InvitationRecordForValidation | null,
  now: Date
): TokenValidationResult {
  if (!invitation) {
    return { valid: false, reason: "NOT_FOUND" satisfies TokenValidationFailureReason };
  }
  if (invitation.status === "REVOKED") {
    return { valid: false, reason: "REVOKED" };
  }
  if (invitation.status === "USED") {
    return { valid: false, reason: "ALREADY_USED" };
  }
  // Reserved for a future optional-expiry feature. MVP invitations have
  // expiresAt = null and never reach this branch.
  if (invitation.expiresAt && now >= invitation.expiresAt) {
    return { valid: false, reason: "EXPIRED" };
  }
  return { valid: true, invitationId: invitation.id, assignmentId: invitation.assignmentId };
}
