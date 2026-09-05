"use server";

import { headers } from "next/headers";
import {
  createSelfServeSession,
  clearSelfServeSession,
  getSelfServeSessionEmail,
  setActiveAttemptTokenCookie,
  getActiveAttemptTokenCookie,
  clearActiveAttemptTokenCookie,
} from "@/lib/self-serve-session";
import { normalizeEmail } from "@/domain/self-serve/email";
import type { PublicFlowStatus } from "@/domain/self-serve/types";
import {
  getEligibility,
  requestVerificationCode,
  startPublicAttempt,
  tokenBelongsToIdentity,
  updateSelfServeCandidateProfile,
  verifyCode,
  type SelfServeCandidateInfo,
} from "@/server/services/self-serve.service";
import { SelfServeSessionRequiredError } from "@/server/errors";
import { runAction, type ActionResult } from "./action-result";

/**
 * Server Action wiring for the public self-service ("Try Yourself")
 * flow — the one place that reads/writes the self-serve session and
 * active-attempt cookies (see /lib/self-serve-session.ts) and combines
 * them with the service layer's derived state. Every function here
 * re-derives the caller's identity from the session cookie itself; none
 * accepts an email/candidateId as a trusted client parameter (the one
 * exception is the email typed into the very first form, before any
 * session exists — see `requestCodeAction`).
 */

async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}

export async function requestCodeAction(email: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    await requestVerificationCode(email, await clientIp());
    return null;
  });
}

export async function verifyCodeAction(email: string, code: string): Promise<ActionResult<null>> {
  return runAction(async () => {
    await verifyCode(email, code, await clientIp());
    await createSelfServeSession(normalizeEmail(email));
    return null;
  });
}

export async function switchToAnotherEmailAction(): Promise<ActionResult<null>> {
  return runAction(async () => {
    await clearSelfServeSession();
    return null;
  });
}

/** The one composed status read for `/try` — combines the derived
 * eligibility with the active-attempt cookie's validity. Used both by
 * the initial server-rendered page and by the client after any
 * transition (submitting the profile form, finishing an attempt,
 * choosing "Take again"). */
export async function getPublicFlowStatusAction(): Promise<ActionResult<PublicFlowStatus>> {
  return runAction(async () => {
    const email = await getSelfServeSessionEmail();
    if (!email) return { kind: "EMAIL_REQUIRED" };

    const eligibility = await getEligibility(email);
    if (eligibility.kind !== "IN_PROGRESS") return eligibility;

    const activeToken = await getActiveAttemptTokenCookie();
    if (activeToken && (await tokenBelongsToIdentity(email, activeToken))) {
      // Valid, resumable in THIS browser — this action doesn't redirect
      // itself (client components can't intercept a server redirect
      // cleanly mid-transition); the caller navigates on `redirectToken`.
      return { ...eligibility, kind: "IN_PROGRESS" };
    }
    return { kind: "IN_PROGRESS_ELSEWHERE", attemptNumber: eligibility.attemptNumber, testTitle: eligibility.testTitle };
  });
}

/** Only meaningful when `getPublicFlowStatusAction` reported
 * `IN_PROGRESS` — returns the token to redirect to, re-validating
 * ownership server-side rather than trusting the earlier read. */
export async function resumeActiveAttemptAction(): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const email = await getSelfServeSessionEmail();
    if (!email) throw new SelfServeSessionRequiredError();
    const token = await getActiveAttemptTokenCookie();
    if (!token || !(await tokenBelongsToIdentity(email, token))) {
      throw new SelfServeSessionRequiredError();
    }
    return { token };
  });
}

export async function updateSelfServeProfileAction(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
}): Promise<ActionResult<SelfServeCandidateInfo>> {
  return runAction(async () => {
    const email = await getSelfServeSessionEmail();
    if (!email) throw new SelfServeSessionRequiredError();
    return updateSelfServeCandidateProfile(email, input);
  });
}

/** Creates the attempt, stashes its token in the active-attempt cookie,
 * and returns it so the client can navigate to `/placement/{token}` —
 * the same, unmodified Test Runner every admin-invited candidate uses. */
export async function startPublicAttemptAction(): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const email = await getSelfServeSessionEmail();
    if (!email) throw new SelfServeSessionRequiredError();
    const { token } = await startPublicAttempt(email);
    await setActiveAttemptTokenCookie(token);
    return { token };
  });
}

/** Called once `/try` observes the active assignment is COMPLETED (the
 * cookie is no longer useful) — cleanup only, never required for
 * correctness (an unused cookie pointing at a USED invitation is
 * harmless), but keeps browser state tidy. */
export async function clearCompletedAttemptCookieAction(): Promise<void> {
  await clearActiveAttemptTokenCookie();
}
