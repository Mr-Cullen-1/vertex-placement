import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure, framework-free HMAC-signed session token logic — no Prisma, no
 * Next.js, no `cookies()`. `src/lib/self-serve-session.ts` wires this to
 * the actual cookie (see that file's doc comment for the full rationale:
 * a second, intentionally distinct session mechanism from Auth.js's
 * admin login, chosen for the same reason Auth.js itself uses a JWT
 * strategy — nothing here needs server-side revocation).
 */

const HMAC_CONTEXT = "vertex-self-serve-session:v1:";

export interface SessionPayload {
  email: string;
  exp: number; // unix ms
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(HMAC_CONTEXT + payload).digest("base64url");
}

export function encodeSessionToken(secret: string, payload: SessionPayload): string {
  const json = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${json}.${sign(secret, json)}`;
}

/** Returns null for a missing, malformed, tampered, or expired token —
 * never throws. `now` is injectable for deterministic expiry tests. */
export function decodeSessionToken(secret: string, token: string, now: number = Date.now()): SessionPayload | null {
  const [json, signature] = token.split(".");
  if (!json || !signature) return null;

  const expected = sign(secret, json);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
