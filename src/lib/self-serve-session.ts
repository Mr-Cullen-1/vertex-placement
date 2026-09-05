import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { encodeSessionToken, decodeSessionToken } from "@/domain/self-serve/session-token";

/**
 * The public self-service session — a second, intentionally distinct
 * session mechanism from Auth.js's admin login (`src/lib/auth.ts`). A
 * verified visitor is a fundamentally different actor: no password, no
 * `User` row, nothing to look up by ID. Like Auth.js's own choice of a
 * JWT strategy "since there's no OAuth provider and no need to revoke
 * sessions server-side," this is a self-contained, HMAC-signed cookie
 * rather than a new database-backed session table — there's nothing here
 * that needs server-side revocation either. Reuses `AUTH_SECRET` (already
 * validated at boot, 32+ chars) for a second, unrelated purpose, with a
 * fixed context prefix so a signature can never be replayed as if it were
 * for a different purpose. See /docs/PHASE_2J_TRY_YOURSELF.md
 * "Session behavior".
 *
 * This file is the one place allowed to call `cookies()` for the
 * self-service flow, mirroring `src/lib/actor.ts`'s role for the admin
 * session — everything past this point (`self-serve.service.ts`) takes a
 * plain normalized email string and has no framework dependency.
 */

const SESSION_COOKIE = "vx_try_session";
const ACTIVE_ATTEMPT_COOKIE = "vx_try_active_token";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Server Function/Route Handler only — see Next.js `cookies()` "Setting
 * cookies is not supported during Server Component rendering". */
export async function createSelfServeSession(normalizedEmail: string): Promise<void> {
  const exp = Date.now() + SESSION_TTL_MS;
  const value = encodeSessionToken(env.AUTH_SECRET, { email: normalizedEmail, exp });
  const store = await cookies();
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Safe to call from a Server Component (read-only). Returns null for a
 * missing, malformed, tampered, or expired cookie — never throws, since
 * "no session yet" is an expected, common state, not an error. */
export async function getSelfServeSessionEmail(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSessionToken(env.AUTH_SECRET, raw)?.email ?? null;
}

/** "Use another email" (requirement: ends only the self-service session,
 * never touches admin auth — a completely separate cookie). Also clears
 * the active-attempt cookie, since it's meaningless without an
 * identity. */
export async function clearSelfServeSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ACTIVE_ATTEMPT_COOKIE);
}

/**
 * The plaintext invitation token for the visitor's CURRENT public
 * attempt, held only in this HttpOnly cookie — exactly the same
 * "plaintext exists only in memory at generation time" model as the
 * admin-issued invitation link (see domain/tokens/token.ts), except here
 * the browser's cookie jar is the "channel" instead of a copy-pasted URL,
 * which is at least as secure (HttpOnly + Secure + SameSite=Lax, never
 * readable by page script). Lets a refresh of `/try` resume the exact
 * live attempt without ever persisting the plaintext token server-side.
 * If this cookie is absent (a different browser, or it was cleared), the
 * server can still always derive the correct free-attempt COUNT from the
 * database — it just can't reconstruct which specific in-progress
 * attempt to resume (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Cross-browser/new session").
 */
export async function setActiveAttemptTokenCookie(plaintextToken: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_ATTEMPT_COOKIE, plaintextToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No fixed maxAge — cleared explicitly once the attempt completes
    // (see clearActiveAttemptTokenCookie), not on a timer.
  });
}

export async function getActiveAttemptTokenCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_ATTEMPT_COOKIE)?.value ?? null;
}

export async function clearActiveAttemptTokenCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_ATTEMPT_COOKIE);
}
