import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import {
  EmailDeliveryError,
  InvalidVerificationCodeError,
  PublicAttemptAlreadyStartingError,
  PublicAttemptLimitReachedError,
  PublicTestUnavailableError,
  ResendCooldownError,
  TooManyVerificationAttemptsError,
  VerificationCodeExpiredError,
} from "@/server/errors";
import { normalizeEmail } from "@/domain/self-serve/email";
import {
  generateVerificationCode,
  hashVerificationCode,
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  VERIFICATION_CODE_TTL_MS,
} from "@/domain/self-serve/code";
import type { EligibilityState } from "@/domain/self-serve/types";
import { candidateInputSchema } from "@/domain/candidate/schema";
import { getEmailService } from "@/server/email";
import { recordAndEnforce } from "@/server/services/rate-limit.service";
import { getPublicSelfServiceTest } from "@/server/services/placement-test.service";
import {
  createSelfServiceAssignment,
  countCompletedSelfServiceAssignments,
  findActiveSelfServiceAssignment,
} from "@/server/services/assignment.service";
import {
  createSelfServiceInvitation,
  regenerateSelfServiceInvitation,
  validateTokenAndLoad,
} from "@/server/services/invitation.service";
import { startOrResumeAttempt, getCompletedResultForAttemptId } from "@/server/services/attempt.service";

/**
 * Phase 2J — public self-service ("Try Yourself") orchestration. This is
 * the ONLY layer that turns "a verified email" into database action —
 * every function here takes a plain normalized email (or, for
 * verification itself, the raw address to normalize), never a client-
 * supplied candidateId/assignmentId, so a request can never act on
 * someone else's identity by guessing an ID (same trust model as the
 * invitation-token flow: the credential — here, the caller having
 * already survived `getSelfServeSessionEmail()` in the action layer —
 * IS the authorization). See /docs/PHASE_2J_TRY_YOURSELF.md.
 *
 * No `Actor`/RBAC anywhere in this file — a public visitor is not an
 * admin. Framework-free otherwise: cookies are read/written one layer up
 * (`src/lib/self-serve-session.ts`, `src/server/actions/self-serve-actions.ts`).
 */

// --- Email verification --------------------------------------------------

export async function requestVerificationCode(rawEmail: string, ip: string | null): Promise<void> {
  const email = normalizeEmail(rawEmail);

  await recordAndEnforce(`code-request:email:${email}`, 60 * 60 * 1000, 5);
  if (ip) await recordAndEnforce(`code-request:ip:${ip}`, 60 * 60 * 1000, 20);

  const latest = await db.publicVerificationCode.findFirst({
    where: { normalizedEmail: email },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const elapsedMs = Date.now() - latest.createdAt.getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      throw new ResendCooldownError(Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000));
    }
  }

  const { plaintext, hash } = generateVerificationCode();
  await db.publicVerificationCode.create({
    data: {
      normalizedEmail: email,
      codeHash: hash,
      expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
    },
  });

  try {
    await getEmailService().sendVerificationCode(email, plaintext);
  } catch {
    throw new EmailDeliveryError();
  }
}

/** Throws on failure (invalid/expired/too-many-attempts). On success,
 * marks the code consumed (single-use) and returns nothing — the caller
 * (a Server Action) is responsible for establishing the session cookie;
 * this function never touches cookies. Never reveals whether `email` has
 * ever been seen before beyond "was this specific code right for it" —
 * there's no separate "does this account exist" branch to leak in the
 * first place, since any email can request a code. */
export async function verifyCode(rawEmail: string, rawCode: string, ip: string | null): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.trim();

  await recordAndEnforce(`code-verify:email:${email}`, 60 * 60 * 1000, 20);
  if (ip) await recordAndEnforce(`code-verify:ip:${ip}`, 60 * 60 * 1000, 60);

  const record = await db.publicVerificationCode.findFirst({
    where: { normalizedEmail: email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw new InvalidVerificationCodeError();
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) throw new TooManyVerificationAttemptsError();
  if (record.expiresAt.getTime() <= Date.now()) throw new VerificationCodeExpiredError();

  const matches = safeHashEquals(hashVerificationCode(code), record.codeHash);
  if (!matches) {
    await db.publicVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new InvalidVerificationCodeError();
  }

  await db.publicVerificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
}

function safeHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// --- Identity ------------------------------------------------------------

/** Resolves the ONE Candidate a verified email owns, creating it (as a
 * pending placeholder — same `profileCompletedAt: null` convention Phase
 * 2J's candidate-ownership fix already established) on first-ever
 * verification. Idempotent and concurrency-safe: `PublicIdentity.
 * normalizedEmail` is unique, so a race between two requests verifying
 * the same email for the first time resolves to the SAME candidate — the
 * loser's create fails the unique constraint and it re-reads the
 * winner's row instead of erroring. Never merges into an admin-created
 * `Candidate` row that happens to share this email string (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Candidate identity/reuse rule") —
 * `PublicIdentity` is a dedicated table with its own FK, so admin data is
 * structurally untouched. */
async function resolveOrCreatePublicIdentity(normalizedEmail: string) {
  const existing = await db.publicIdentity.findUnique({
    where: { normalizedEmail },
    include: { candidate: true },
  });
  if (existing) return existing;

  try {
    return await db.$transaction(async (tx) => {
      const candidate = await tx.candidate.create({
        data: { firstName: "", lastName: "", phoneNumber: "", age: 0, email: null, profileCompletedAt: null },
      });
      const identity = await tx.publicIdentity.create({
        data: { normalizedEmail, candidateId: candidate.id },
      });
      return { ...identity, candidate };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const winner = await db.publicIdentity.findUnique({
        where: { normalizedEmail },
        include: { candidate: true },
      });
      if (winner) return winner;
    }
    throw error;
  }
}

export interface SelfServeCandidateInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  email: string;
}

/** Updates the candidate's own profile in place — never creates a second
 * candidate for this email (see `resolveOrCreatePublicIdentity`). The
 * verified email is written to `Candidate.email` automatically; it is
 * never taken from the submitted form (the visitor cannot change it —
 * see /docs/PHASE_2J_TRY_YOURSELF.md "Personal details"). */
export async function updateSelfServeCandidateProfile(
  normalizedEmail: string,
  input: { firstName: string; lastName: string; phoneNumber: string; age: number }
): Promise<SelfServeCandidateInfo> {
  const data = candidateInputSchema.parse({ ...input, email: normalizedEmail });
  const identity = await resolveOrCreatePublicIdentity(normalizedEmail);

  const candidate = await db.candidate.update({
    where: { id: identity.candidateId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      age: data.age,
      email: normalizedEmail,
      profileCompletedAt: new Date(),
    },
  });

  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    phoneNumber: candidate.phoneNumber,
    age: candidate.age,
    email: normalizedEmail,
  };
}

// --- Eligibility -----------------------------------------------------------

/** The one derived state for `/try` — see /domain/self-serve/types.ts.
 * Always resolves/creates the identity first (cheap, idempotent), so
 * every other branch can assume a candidate row exists. */
export async function getEligibility(normalizedEmail: string): Promise<EligibilityState> {
  const publicTest = await getPublicSelfServiceTest();
  if (!publicTest) return { kind: "PUBLIC_TEST_UNAVAILABLE" };

  const identity = await resolveOrCreatePublicIdentity(normalizedEmail);
  if (!identity.candidate.profileCompletedAt) return { kind: "PROFILE_REQUIRED" };

  const [completedCount, active] = await Promise.all([
    countCompletedSelfServiceAssignments(identity.candidateId),
    findActiveSelfServiceAssignment(identity.candidateId),
  ]);

  if (active) {
    return {
      kind: "IN_PROGRESS",
      attemptNumber: (completedCount + 1) as 1 | 2,
      testTitle: active.test.title,
    };
  }

  if (completedCount >= 2) {
    const result = await getLatestCompletedResult(identity.candidateId);
    return { kind: "LIMIT_REACHED", result };
  }

  if (completedCount === 1) {
    const result = await getLatestCompletedResult(identity.candidateId);
    return { kind: "ATTEMPT_COMPLETE", attemptNumber: 1, result };
  }

  return {
    kind: "READY",
    attemptNumber: 1,
    testTitle: publicTest.title,
    durationSeconds: publicTest.durationSeconds,
    totalQuestions: publicTest.totalQuestionCount,
  };
}

async function getLatestCompletedResult(candidateId: string) {
  const assignment = await db.placementAssignment.findFirst({
    where: { candidateId, origin: "SELF_SERVICE", status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    include: { attempts: { where: { isCanonical: true }, take: 1 } },
  });
  const attemptId = assignment?.attempts[0]?.id;
  if (!attemptId) throw new PublicTestUnavailableError(); // structurally unreachable — defensive only
  return getCompletedResultForAttemptId(attemptId);
}

// --- Starting an attempt ---------------------------------------------------

/** Creates (or, for the rare orphaned-PENDING edge case, recovers) a
 * brand-new active self-service assignment + invitation + attempt, and
 * returns the plaintext token for the caller to redirect the browser to
 * `/placement/{token}` — the exact same, unmodified Test Runner an
 * admin-invited candidate uses (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Shared Test Runner"). Only ever called when eligibility is READY;
 * re-validates that server-side regardless, since eligibility is
 * derived, not trusted from an earlier client read. */
export async function startPublicAttempt(normalizedEmail: string): Promise<{ token: string }> {
  const publicTest = await getPublicSelfServiceTest();
  if (!publicTest) throw new PublicTestUnavailableError();

  const identity = await resolveOrCreatePublicIdentity(normalizedEmail);
  const completedCount = await countCompletedSelfServiceAssignments(identity.candidateId);
  if (completedCount >= 2) throw new PublicAttemptLimitReachedError();

  let invitationToken: string;
  try {
    const assignment = await createSelfServiceAssignment(publicTest.id, identity.candidateId);
    // Freshly created — origin=SELF_SERVICE, status defaults to PENDING,
    // and it structurally cannot have an invitation yet, so this is
    // always a plain "issue the first one," never a recovery.
    const invitation = await createSelfServiceInvitation(assignment.id);
    invitationToken = invitation.plaintextToken;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    // A concurrent request already created (or is creating) the active
    // assignment — see the partial unique index in the migration.
    const existing = await findActiveSelfServiceAssignment(identity.candidateId);
    if (!existing) throw error;

    if (existing.status === "IN_PROGRESS") {
      // The other request already has a live attempt under a token we
      // hold no plaintext for — nothing safe to do here but ask the
      // caller to re-check eligibility (which the WINNING request's
      // response cookie, landing in the same browser, will resolve).
      throw new PublicAttemptAlreadyStartingError();
    }
    // existing.status === "PENDING" — the winner's assignment+invitation
    // were created but the attempt hasn't started yet (or a prior call
    // crashed in that exact window). Regenerating is safe specifically
    // because no PlacementAttempt exists yet for this assignment.
    const recovered = await regenerateSelfServiceInvitation(existing.id);
    invitationToken = recovered.plaintextToken;
  }

  await startOrResumeAttempt(invitationToken);
  return { token: invitationToken };
}

/** Defense-in-depth check used before honoring the active-attempt-token
 * cookie (see /lib/self-serve-session.ts): confirms the token really
 * does belong to THIS verified identity's candidate before redirecting
 * to it, rather than trusting the cookie's mere presence. Returns false
 * (never throws) for any invalid/expired/mismatched token — the caller
 * treats that the same as "no usable cookie". */
export async function tokenBelongsToIdentity(
  normalizedEmail: string,
  plaintextToken: string
): Promise<boolean> {
  const identity = await db.publicIdentity.findUnique({ where: { normalizedEmail } });
  if (!identity) return false;
  try {
    const { assignment } = await validateTokenAndLoad(plaintextToken);
    return assignment.candidateId === identity.candidateId;
  } catch {
    return false;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
