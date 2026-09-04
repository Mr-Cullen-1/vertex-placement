import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import {
  AttemptExpiredError,
  AttemptNotFoundError,
  DuplicateSubmissionError,
  InvalidAttemptStateError,
  InvalidOptionError,
  InvitationUsedError,
  QuestionNotFoundError,
  TestNotPublishedError,
} from "@/server/errors";
import { validateTokenAndLoad } from "@/server/services/invitation.service";
import { buildOptionOrder } from "@/domain/attempts/option-order";
import { computeAttemptExpiry, isPastDeadline } from "@/domain/attempts/timing";
import { computeScoring, type ScoringQuestionInput } from "@/domain/scoring/engine";
import {
  computeAnswerBreakdown,
  type ProgressionAnswerInput,
  type ProgressionQuestionInput,
} from "@/domain/placement/progression";
import { hashInvitationToken } from "@/domain/tokens/token";
import {
  buildAdminResultDetail,
  buildStudentResultSummary,
} from "@/domain/results/present";
import type { AdminResultDetail, StudentResultSummary } from "@/domain/results/types";
import type { TopicPerformanceEntry } from "@/domain/scoring/types";

/**
 * The attempt lifecycle and the ONE shared finalization pipeline (see
 * /docs/ARCHITECTURE.md "Attempt lifecycle" and /docs/PHASE_1.md
 * "Submission pipeline"). Every function here re-validates
 * `expiresAt` server-side — nothing trusts a client-reported elapsed
 * time, selected-option correctness, or attempt/candidate identity
 * beyond what the invitation token proves.
 */

export type AttemptFlowResult =
  | { status: "IN_PROGRESS"; attemptId: string; expiresAt: string; totalQuestions: number }
  | { status: "COMPLETED"; attemptId: string; result: StudentResultSummary };

/** Entry point for a student opening /placement/{token}. Creates a new
 * attempt on first visit; resumes the existing one on refresh — never
 * creates a second attempt for the same invitation (DB-unique on
 * invitationId is the final backstop against a race). If the existing
 * attempt's deadline has already passed, finalizes it as AUTO_SUBMITTED
 * before returning, per the on-access enforcement model. */
export async function startOrResumeAttempt(plaintextToken: string): Promise<AttemptFlowResult> {
  const { invitation, assignment, test } = await validateTokenAndLoad(plaintextToken);

  const existing = await db.placementAttempt.findUnique({
    where: { invitationId: invitation.id },
  });

  if (existing) {
    // Resuming is allowed even if the test has since been archived — see
    // /docs/ARCHITECTURE.md ("PlacementTest lifecycle"): archiving stops
    // NEW assignments/attempts, it must not interrupt one already under
    // way. The PUBLISHED check below only gates starting a brand-new
    // attempt.
    return resumeExisting(existing.id);
  }

  if (test.status !== "PUBLISHED") {
    throw new TestNotPublishedError();
  }

  return createNewAttempt(invitation.id, assignment.id, test.id, test.durationSeconds);
}

async function resumeExisting(attemptId: string): Promise<AttemptFlowResult> {
  const attempt = await requireAttempt(attemptId);

  if (attempt.status !== "IN_PROGRESS") {
    // Structurally shouldn't happen — a terminal attempt implies its
    // invitation is USED, which validateTokenAndLoad would already have
    // rejected. Treated as a hard invariant violation rather than a
    // normal error path.
    throw new InvalidAttemptStateError("Attempt is not resumable.");
  }

  if (isPastDeadline(new Date(), attempt.expiresAt)) {
    const result = await finalizeAttempt(attemptId, "AUTO");
    return { status: "COMPLETED", attemptId, result };
  }

  const totalQuestions = await db.question.count({
    where: { testId: attempt.assignment.testId, status: "PUBLISHED" },
  });

  return {
    status: "IN_PROGRESS",
    attemptId,
    expiresAt: attempt.expiresAt.toISOString(),
    totalQuestions,
  };
}

async function createNewAttempt(
  invitationId: string,
  assignmentId: string,
  testId: string,
  durationSeconds: number
): Promise<AttemptFlowResult> {
  const questions = await db.question.findMany({
    where: { testId, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: { options: true },
  });
  if (questions.length === 0) {
    // Invariant: publishPlacementTest requires >=1 published question.
    // Guarded anyway since this would otherwise produce an unusable attempt.
    throw new TestNotPublishedError();
  }

  const startedAt = new Date();
  const expiresAt = computeAttemptExpiry(startedAt, durationSeconds);
  const optionOrder = buildOptionOrder(
    questions.map((q) => ({ id: q.id, optionIds: q.options.map((o) => o.id) }))
  );

  try {
    await db.$transaction(async (tx) => {
      await tx.placementAttempt.create({
        data: {
          assignmentId,
          invitationId,
          startedAt,
          expiresAt,
          optionOrder,
        },
      });
      await tx.placementAssignment.updateMany({
        where: { id: assignmentId, status: "PENDING" },
        data: { status: "IN_PROGRESS" },
      });
    });
  } catch (error) {
    // P2002 = unique constraint violation on invitationId — a concurrent
    // request already created the attempt. Resume it instead of failing.
    if (isUniqueConstraintError(error)) {
      const existing = await db.placementAttempt.findUnique({ where: { invitationId } });
      if (existing) return resumeExisting(existing.id);
    }
    throw error;
  }

  const created = await db.placementAttempt.findUniqueOrThrow({ where: { invitationId } });
  return {
    status: "IN_PROGRESS",
    attemptId: created.id,
    expiresAt: created.expiresAt.toISOString(),
    totalQuestions: questions.length,
  };
}

// --- Reading the current question set (student-facing, no correctness) ---

export interface AttemptQuestionView {
  questionId: string;
  order: number;
  prompt: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
}

/** Public entry point — takes the invitation token, never a bare
 * attemptId. See the module-level note: an attemptId is an internal
 * database key, not a credential, and the client must never be trusted
 * to supply one on its own (/docs/PHASE_1.md "Security review"). */
export async function getAttemptQuestions(plaintextToken: string): Promise<AttemptQuestionView[]> {
  const attemptId = await requireAttemptIdForToken(plaintextToken);
  return getAttemptQuestionsByAttemptId(attemptId);
}

async function getAttemptQuestionsByAttemptId(attemptId: string): Promise<AttemptQuestionView[]> {
  await autoFinalizeIfExpired(attemptId, /* throwIfFinalized */ true);

  const attempt = await requireAttempt(attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new InvalidAttemptStateError();
  }

  const [questions, answers] = await Promise.all([
    db.question.findMany({
      where: { testId: attempt.assignment.testId, status: "PUBLISHED" },
      orderBy: { order: "asc" },
      include: { options: true },
    }),
    db.placementAnswer.findMany({ where: { attemptId } }),
  ]);

  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));
  const optionOrder = attempt.optionOrder as Record<string, string[]>;

  return questions.map((question) => {
    const optionsById = new Map(question.options.map((o) => [o.id, o]));
    const orderedIds = optionOrder[question.id] ?? question.options.map((o) => o.id);
    return {
      questionId: question.id,
      order: question.order,
      prompt: question.prompt,
      options: orderedIds
        .map((id) => optionsById.get(id))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((o) => ({ id: o.id, text: o.text })),
      selectedOptionId: selectedByQuestionId.get(question.id) ?? null,
    };
  });
}

// --- Answering ---------------------------------------------------------

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1).nullable(),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

/** Public entry point — token-based, see getAttemptQuestions above. */
export async function submitAnswer(
  plaintextToken: string,
  input: SubmitAnswerInput
): Promise<void> {
  const attemptId = await requireAttemptIdForToken(plaintextToken);
  return submitAnswerByAttemptId(attemptId, input);
}

async function submitAnswerByAttemptId(
  attemptId: string,
  input: SubmitAnswerInput
): Promise<void> {
  const data = submitAnswerSchema.parse(input);

  await autoFinalizeIfExpired(attemptId, /* throwIfFinalized */ true);

  const attempt = await requireAttempt(attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new InvalidAttemptStateError();
  }

  const question = await db.question.findUnique({
    where: { id: data.questionId },
    include: { options: true },
  });
  if (!question || question.testId !== attempt.assignment.testId) {
    throw new QuestionNotFoundError();
  }

  if (data.selectedOptionId !== null) {
    const belongsToQuestion = question.options.some((o) => o.id === data.selectedOptionId);
    if (!belongsToQuestion) throw new InvalidOptionError();
  }

  await db.placementAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId: data.questionId } },
    create: { attemptId, questionId: data.questionId, selectedOptionId: data.selectedOptionId },
    update: { selectedOptionId: data.selectedOptionId },
  });
}

// --- Submission (manual) ------------------------------------------------

/** Public entry point — token-based, see getAttemptQuestions above. Once
 * an attempt is finalized its invitation becomes USED, so a *sequential*
 * repeat call surfaces as InvitationUsedError at the token-validation
 * step below (arguably the more precise signal to a student: "this link
 * was already completed"). DuplicateSubmissionError is reserved for the
 * narrower race where two requests both pass token validation before
 * either has finalized — see the atomic guard in finalizeAttempt. */
export async function submitAttempt(plaintextToken: string): Promise<StudentResultSummary> {
  const attemptId = await requireAttemptIdForToken(plaintextToken);
  return submitAttemptByAttemptId(attemptId);
}

async function submitAttemptByAttemptId(attemptId: string): Promise<StudentResultSummary> {
  const attempt = await requireAttempt(attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new DuplicateSubmissionError();
  }
  const trigger = isPastDeadline(new Date(), attempt.expiresAt) ? "AUTO" : "MANUAL";
  return finalizeAttempt(attemptId, trigger);
}

// --- The one shared finalization pipeline -------------------------------
//
// Both manual submission and lazy auto-submission-on-access call this.
// There is exactly one place scoring + result creation + invitation
// invalidation + canonical-result determination happen, so the two
// triggers can never disagree about how a result is computed.
async function finalizeAttempt(
  attemptId: string,
  trigger: "MANUAL" | "AUTO"
): Promise<StudentResultSummary> {
  const attempt = await requireAttempt(attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new DuplicateSubmissionError();
  }

  const now = new Date();
  const finalStatus =
    trigger === "AUTO" || isPastDeadline(now, attempt.expiresAt) ? "AUTO_SUBMITTED" : "SUBMITTED";

  const testId = attempt.assignment.testId;

  const [questions, answers, bands, priorCanonical, candidate] = await Promise.all([
    db.question.findMany({
      where: { testId, status: "PUBLISHED" },
      orderBy: { order: "asc" },
      include: { options: true, metadata: true },
    }),
    db.placementAnswer.findMany({ where: { attemptId } }),
    db.placementBand.findMany({ where: { testId } }),
    db.placementAttempt.findFirst({
      where: {
        assignmentId: attempt.assignmentId,
        isCanonical: true,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        id: { not: attemptId },
      },
    }),
    db.candidate.findUniqueOrThrow({ where: { id: attempt.assignment.candidateId } }),
  ]);

  const scoringQuestions: ScoringQuestionInput[] = questions.map((q) => {
    const correct = q.options.find((o) => o.isCorrect);
    return {
      questionId: q.id,
      correctOptionId: correct?.id ?? "",
      difficultyBand: q.metadata?.difficultyBand ?? null,
      topic: q.metadata?.topic ?? null,
    };
  });
  const scoringAnswers = answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: a.selectedOptionId,
  }));

  const scoring = computeScoring(scoringQuestions, scoringAnswers, bands);

  // Placement GUIDANCE — a separate concern from score (see
  // /domain/placement/progression.ts). Reuses the same `questions`/
  // `answers` already fetched above; needs each question's fixed
  // `order`, which scoringQuestions above deliberately omits (score
  // itself must never depend on question order).
  const progressionQuestions: ProgressionQuestionInput[] = questions.map((q) => ({
    questionId: q.id,
    order: q.order,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? "",
  }));
  const progressionAnswers: ProgressionAnswerInput[] = answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: a.selectedOptionId,
  }));
  const progression = computeAnswerBreakdown(progressionQuestions, progressionAnswers);

  const isCanonical = priorCanonical === null;
  const completionSeconds = Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000);

  await db.$transaction(async (tx) => {
    // Atomic guard against a concurrent finalize (double manual submit,
    // or a manual submit racing the lazy auto-submit check).
    const updated = await tx.placementAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status: finalStatus, submittedAt: now, isCanonical },
    });
    if (updated.count === 0) {
      throw new DuplicateSubmissionError();
    }

    await tx.placementResult.create({
      data: {
        attemptId,
        rawScore: scoring.rawScore.rawScore,
        totalQuestions: scoring.rawScore.totalQuestions,
        percentage: scoring.rawScore.percentage,
        completionSeconds,
        placementBandId: scoring.placementBand?.placementBandId ?? null,
        difficultyProgression: scoring.difficultyProgression as unknown as Prisma.InputJsonValue,
        topicPerformance: scoring.topicPerformance as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.placementInvitation.update({
      where: { id: attempt.invitationId },
      data: { status: "USED", usedAt: now },
    });
    await tx.placementAssignment.update({
      where: { id: attempt.assignmentId },
      data: { status: "COMPLETED" },
    });

    // Future hook: emit a PLACEMENT_COMPLETED domain event here for the
    // notification service (Telegram etc.) — not implemented in Phase 1,
    // see /docs/ARCHITECTURE.md ("Telegram integration").
  });

  return buildStudentResultSummary({
    attemptId,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    level: scoring.placementBand?.label ?? null,
    rawScore: scoring.rawScore.rawScore,
    totalQuestions: scoring.rawScore.totalQuestions,
    percentage: scoring.rawScore.percentage,
    completionSeconds,
    topicPerformance: scoring.topicPerformance,
    progression,
    autoSubmitted: finalStatus === "AUTO_SUBMITTED",
  });
}

/** If the attempt is IN_PROGRESS and past its deadline, finalizes it as
 * AUTO_SUBMITTED right now. Returns true if it just did (or already had)
 * finalize — callers pass `throwIfFinalized` to convert that into an
 * AttemptExpiredError for request paths that expected an active attempt. */
async function autoFinalizeIfExpired(attemptId: string, throwIfFinalized: boolean) {
  const attempt = await requireAttempt(attemptId);
  if (attempt.status !== "IN_PROGRESS") return;
  if (!isPastDeadline(new Date(), attempt.expiresAt)) return;

  await finalizeAttempt(attemptId, "AUTO");
  if (throwIfFinalized) throw new AttemptExpiredError();
}

// --- Placement status & completed result (student-facing) ---------------
//
// Phase 2A additions. Neither computes/recomputes scoring — both are pure
// reads that either return already-persisted data (getCompletedResultForToken)
// or decide which UI phase the token should land on without creating an
// attempt as a side effect (getPlacementStatus). See /docs/PHASE_2A.md.

export type PlacementStatus =
  | {
      kind: "NOT_STARTED";
      testTitle: string;
      durationSeconds: number;
      totalQuestions: number;
      candidate: { firstName: string; lastName: string; phoneNumber: string; age: number; email: string | null };
    }
  | { kind: "IN_PROGRESS"; expiresAt: string; totalQuestions: number }
  | { kind: "COMPLETED"; result: StudentResultSummary }
  | { kind: "TEST_UNAVAILABLE" };

/** Resolves what the /placement/{token} page should show WITHOUT the side
 * effect of starting an attempt (unlike startOrResumeAttempt, which
 * creates one) — the pre-attempt wizard (welcome/candidate-info/
 * instructions) must not start the 30-minute clock before the student
 * has actually chosen to begin. An already-expired IN_PROGRESS attempt
 * is still finalized here (consistent with the on-access enforcement
 * model everywhere else), since discovering that state should not be a
 * silent no-op. */
export async function getPlacementStatus(plaintextToken: string): Promise<PlacementStatus> {
  let loaded: Awaited<ReturnType<typeof validateTokenAndLoad>>;
  try {
    loaded = await validateTokenAndLoad(plaintextToken);
  } catch (error) {
    if (error instanceof InvitationUsedError) {
      return { kind: "COMPLETED", result: await getCompletedResultForToken(plaintextToken) };
    }
    throw error;
  }

  const existing = await db.placementAttempt.findUnique({
    where: { invitationId: loaded.invitation.id },
  });

  if (existing) {
    if (existing.status !== "IN_PROGRESS") {
      // Invariant: a non-IN_PROGRESS attempt implies its invitation is
      // USED, which would already have been caught above. Defensive only.
      return { kind: "COMPLETED", result: await getCompletedResultForToken(plaintextToken) };
    }
    if (isPastDeadline(new Date(), existing.expiresAt)) {
      const result = await finalizeAttempt(existing.id, "AUTO");
      return { kind: "COMPLETED", result };
    }
    const totalQuestions = await db.question.count({
      where: { testId: loaded.assignment.testId, status: "PUBLISHED" },
    });
    return {
      kind: "IN_PROGRESS",
      expiresAt: existing.expiresAt.toISOString(),
      totalQuestions,
    };
  }

  if (loaded.test.status !== "PUBLISHED") {
    return { kind: "TEST_UNAVAILABLE" };
  }

  const [test, candidate, totalQuestions] = await Promise.all([
    db.placementTest.findUniqueOrThrow({ where: { id: loaded.assignment.testId } }),
    db.candidate.findUniqueOrThrow({ where: { id: loaded.assignment.candidateId } }),
    db.question.count({ where: { testId: loaded.assignment.testId, status: "PUBLISHED" } }),
  ]);

  return {
    kind: "NOT_STARTED",
    testTitle: test.title,
    durationSeconds: test.durationSeconds,
    totalQuestions,
    candidate: {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      phoneNumber: candidate.phoneNumber,
      age: candidate.age,
      email: candidate.email,
    },
  };
}

/** Re-derives a student's own already-computed result from the persisted
 * `PlacementResult` — never recomputes scoring (there is exactly one
 * finalization pipeline; this only reads its output). Used both by
 * `getPlacementStatus` and directly when a student revisits a completed
 * link (e.g. refreshing the result page). */
export async function getCompletedResultForToken(
  plaintextToken: string
): Promise<StudentResultSummary> {
  const tokenHash = hashInvitationToken(plaintextToken);
  const invitation = await db.placementInvitation.findUnique({
    where: { tokenHash },
    include: {
      attempt: {
        include: {
          answers: true,
          result: { include: { placementBand: true } },
          assignment: { include: { candidate: true } },
        },
      },
    },
  });

  if (!invitation || invitation.status !== "USED" || !invitation.attempt?.result) {
    throw new AttemptNotFoundError();
  }

  const { attempt } = invitation;
  const candidate = attempt.assignment.candidate;
  const topicPerformance = attempt.result!.topicPerformance as unknown as TopicPerformanceEntry[];

  // Placement guidance is re-derived fresh from the immutable
  // answers/questions every time (never persisted) — see
  // finalizeAttempt's comment and /docs/PHASE_2E.md.
  const questions = await db.question.findMany({
    where: { testId: attempt.assignment.testId, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: { options: true },
  });
  const progressionQuestions: ProgressionQuestionInput[] = questions.map((q) => ({
    questionId: q.id,
    order: q.order,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? "",
  }));
  const progressionAnswers: ProgressionAnswerInput[] = attempt.answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: a.selectedOptionId,
  }));
  const progression = computeAnswerBreakdown(progressionQuestions, progressionAnswers);

  return buildStudentResultSummary({
    attemptId: attempt.id,
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    level: attempt.result!.placementBand?.label ?? null,
    rawScore: attempt.result!.rawScore,
    totalQuestions: attempt.result!.totalQuestions,
    percentage: attempt.result!.percentage,
    completionSeconds: attempt.result!.completionSeconds,
    topicPerformance,
    progression,
    autoSubmitted: attempt.status === "AUTO_SUBMITTED",
  });
}

// --- Admin read: full result detail --------------------------------------

export async function getAdminResultDetail(
  actor: Actor,
  attemptId: string
): Promise<AdminResultDetail> {
  assertPermission(actor, "result:read");

  const attempt = await db.placementAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assignment: { include: { candidate: true, test: true } },
      answers: true,
      result: { include: { placementBand: true } },
    },
  });
  if (!attempt || !attempt.result) throw new AttemptNotFoundError();

  const questions = await db.question.findMany({
    where: { testId: attempt.assignment.testId, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: { options: true, metadata: true },
  });
  const selectedByQuestionId = new Map(
    attempt.answers.map((a) => [a.questionId, a.selectedOptionId])
  );

  const questionAnalysis = questions.map((question) => {
    const correctOption = question.options.find((o) => o.isCorrect);
    const selectedOptionId = selectedByQuestionId.get(question.id) ?? null;
    const selectedOption = question.options.find((o) => o.id === selectedOptionId);
    return {
      questionId: question.id,
      order: question.order,
      prompt: question.prompt,
      topic: question.metadata?.topic ?? null,
      difficultyBand: question.metadata?.difficultyBand ?? null,
      selectedOptionText: selectedOption?.text ?? null,
      correctOptionText: correctOption?.text ?? "",
      isAnswered: selectedOptionId !== null,
      isCorrect: Boolean(selectedOption && correctOption && selectedOption.id === correctOption.id),
    };
  });

  const progressionQuestions: ProgressionQuestionInput[] = questions.map((q) => ({
    questionId: q.id,
    order: q.order,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? "",
  }));
  const progressionAnswers: ProgressionAnswerInput[] = attempt.answers.map((a) => ({
    questionId: a.questionId,
    selectedOptionId: a.selectedOptionId,
  }));
  const progression = computeAnswerBreakdown(progressionQuestions, progressionAnswers);

  return buildAdminResultDetail({
    attemptId: attempt.id,
    candidate: {
      firstName: attempt.assignment.candidate.firstName,
      lastName: attempt.assignment.candidate.lastName,
      phoneNumber: attempt.assignment.candidate.phoneNumber,
      age: attempt.assignment.candidate.age,
      email: attempt.assignment.candidate.email,
    },
    testTitle: attempt.assignment.test.title,
    level: attempt.result.placementBand?.label ?? null,
    rawScore: attempt.result.rawScore,
    totalQuestions: attempt.result.totalQuestions,
    percentage: attempt.result.percentage,
    completionSeconds: attempt.result.completionSeconds,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: (attempt.submittedAt ?? attempt.startedAt).toISOString(),
    isCanonical: attempt.isCanonical,
    status: attempt.status as "SUBMITTED" | "AUTO_SUBMITTED",
    difficultyProgression:
      attempt.result.difficultyProgression as unknown as AdminResultDetail["difficultyProgression"],
    topicPerformance:
      attempt.result.topicPerformance as unknown as AdminResultDetail["topicPerformance"],
    progression,
    questionAnalysis,
  });
}

// --- Shared internals ------------------------------------------------

/** Resolves a plaintext token to its attempt's internal id, re-running
 * the full invitation state-machine check every time (NOT_FOUND /
 * REVOKED / ALREADY_USED). This is the only sanctioned way in from
 * outside this module — the attemptId itself is never accepted as
 * caller-supplied input to a public function. */
async function requireAttemptIdForToken(plaintextToken: string): Promise<string> {
  const { invitation } = await validateTokenAndLoad(plaintextToken);
  const attempt = await db.placementAttempt.findUnique({ where: { invitationId: invitation.id } });
  if (!attempt) throw new AttemptNotFoundError();
  return attempt.id;
}

async function requireAttempt(attemptId: string) {
  const attempt = await db.placementAttempt.findUnique({
    where: { id: attemptId },
    include: { assignment: true },
  });
  if (!attempt) throw new AttemptNotFoundError();
  return attempt;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
