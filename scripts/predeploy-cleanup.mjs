/**
 * Pre-deployment QA/dev data cleanup.
 *
 * The product has never been deployed publicly, so every Candidate/
 * Assignment/Invitation/Attempt/Answer/Result/PublicIdentity/
 * PublicVerificationCode/RateLimitEvent row currently in this database was
 * created during development or manual/automated QA — there are no real
 * end users yet. The one thing that IS real production content is the
 * "Language Hub Placement Test" itself (imported from the source PDF, with
 * its 70 questions and the approved institutional RAW_SCORE bands) — see
 * /docs/PHASE_2L_SCORING_POLICY.md. Everything else this script classifies
 * as QA and, only with --apply, deletes.
 *
 * Classification is by EXACT ID, decided by hand after inspecting every
 * row (see the pre-deploy audit report), never by title substring/pattern
 * matching alone:
 *
 * - PROTECTED_TEST_IDS: the canonical Language Hub test. Verified by data
 *   (70 questions, the 6 approved institutional bands, PUBLISHED), not by
 *   title alone.
 * - PROTECTED_CANDIDATE_IDS: currently empty. "Amina Karimova" (candidate
 *   cmtosqe0n0000ysos105twreh) was the one initially-ambiguous case — no
 *   QA-fixture test link, no synthetic/self-service email, no "QA"/
 *   "Phase2..." name pattern — but her ONE assignment's invitation was
 *   regenerated 12 times between 2026-09-05 and 2026-09-07, entirely
 *   inside this development session's own QA activity window. No real,
 *   never-yet-launched candidate accumulates 12 invitation regenerations
 *   in 48 hours; this is a repeated-QA-reuse signature, so she is
 *   classified QA-DELETE too. If a future run ever finds a genuinely
 *   ambiguous row, add its id here rather than deleting it.
 *
 * Every other PlacementTest is QA (by explicit title AND data evidence —
 * a zero-content DRAFT scratch test, an explicitly-named "QA Import Test",
 * an explicitly-named "TryYourself QA Test", and a test whose own title
 * says "(Long-Data QA Fixture)"). Every Candidate is QA (three
 * "Phase2I ..." QA-runner identities, "Result QA"/"QA Correction"/"Mobile
 * Fix" identities, an obviously-synthetic long-name overflow-test
 * candidate, self-testing entries under the admin's own name/email, and
 * the same real person's self-service "Diyorbek Nematullaev" identity,
 * corroborated by synthetic `+timestamp@example.com` rate-limit/
 * verification-code trails from this same development session).
 *
 * DEFAULT MODE IS DRY RUN — reports counts only, writes nothing.
 * Pass --apply to actually delete.
 *
 * Usage:
 *   node scripts/predeploy-cleanup.mjs            (dry run)
 *   node scripts/predeploy-cleanup.mjs --apply     (deletes)
 *
 * Idempotent: a second --apply run finds zero QA rows left (every
 * candidate/test id is re-queried fresh each run, never assumed from a
 * prior report) and deletes nothing further.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const PROTECTED_TEST_IDS = [
  "cmtmxwk8q008n8cosi2gh88kt", // Language Hub Placement Test — canonical production test
];

const PROTECTED_CANDIDATE_IDS = [
  // Empty — see the file header for why "Amina Karimova" was reclassified
  // from initially-ambiguous to QA-DELETE.
];

const APPLY = process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const allTests = await db.placementTest.findMany({
    select: { id: true, title: true, status: true, isPublicSelfService: true },
  });
  const qaTests = allTests.filter((t) => !PROTECTED_TEST_IDS.includes(t.id));
  const keptTests = allTests.filter((t) => PROTECTED_TEST_IDS.includes(t.id));

  const allCandidates = await db.candidate.findMany({ select: { id: true, firstName: true, lastName: true } });
  const qaCandidateIds = allCandidates
    .filter((c) => !PROTECTED_CANDIDATE_IDS.includes(c.id))
    .map((c) => c.id);

  const qaTestIds = qaTests.map((t) => t.id);

  // An assignment is QA if it belongs to a QA test (any candidate) OR to a
  // QA candidate (even one on the protected test) — this single condition
  // correctly reaches the QA candidates' assignments on the Language Hub
  // test without touching the protected candidate's own assignment there.
  const qaAssignments = await db.placementAssignment.findMany({
    where: { OR: [{ testId: { in: qaTestIds } }, { candidateId: { in: qaCandidateIds } }] },
    select: { id: true, testId: true, candidateId: true },
  });
  const qaAssignmentIds = qaAssignments.map((a) => a.id);

  const [attemptCount, invitationCount, resultCount, answerCount] = await Promise.all([
    db.placementAttempt.count({ where: { assignmentId: { in: qaAssignmentIds } } }),
    db.placementInvitation.count({ where: { assignmentId: { in: qaAssignmentIds } } }),
    db.placementResult.count({ where: { attempt: { assignmentId: { in: qaAssignmentIds } } } }),
    db.placementAnswer.count({ where: { attempt: { assignmentId: { in: qaAssignmentIds } } } }),
  ]);

  const qaQuestionCount = await db.question.count({ where: { testId: { in: qaTestIds } } });
  const qaBandCount = await db.placementBand.count({ where: { testId: { in: qaTestIds } } });
  const qaImportJobCount = await db.importJob.count({ where: { testId: { in: qaTestIds } } });

  const publicIdentityCount = await db.publicIdentity.count();
  const publicVerificationCodeCount = await db.publicVerificationCode.count();
  const rateLimitEventCount = await db.rateLimitEvent.count();

  console.log(`Mode: ${APPLY ? "APPLY (will delete)" : "DRY RUN (report only)"}`);
  console.log("");
  console.log("KEEP tests:");
  for (const t of keptTests) console.log(`  [${t.id}] "${t.title}" (${t.status})`);
  console.log("");
  console.log("QA-DELETE tests:");
  for (const t of qaTests) console.log(`  [${t.id}] "${t.title}" (${t.status})`);
  console.log("");
  console.log(`QA-DELETE candidates: ${qaCandidateIds.length} of ${allCandidates.length} total`);
  console.log(`Protected candidates: ${PROTECTED_CANDIDATE_IDS.length}`);
  console.log("");
  console.log("Rows that would be removed:");
  console.log(`  Assignments:  ${qaAssignmentIds.length}`);
  console.log(`  Invitations:  ${invitationCount}`);
  console.log(`  Attempts:     ${attemptCount}`);
  console.log(`  Answers:      ${answerCount}`);
  console.log(`  Results:      ${resultCount}`);
  console.log(`  Candidates:   ${qaCandidateIds.length}`);
  console.log(`  Questions:    ${qaQuestionCount}`);
  console.log(`  Bands:        ${qaBandCount}`);
  console.log(`  Import jobs:  ${qaImportJobCount}`);
  console.log(`  Tests:        ${qaTests.length}`);
  console.log(`  PublicIdentity (all):          ${publicIdentityCount}`);
  console.log(`  PublicVerificationCode (all):  ${publicVerificationCodeCount}`);
  console.log(`  RateLimitEvent (all):          ${rateLimitEventCount}`);

  if (!APPLY) {
    console.log("");
    console.log("Dry run only — no rows were deleted. Re-run with --apply to delete.");
    return;
  }

  await db.$transaction(async (tx) => {
    await tx.placementAttempt.deleteMany({ where: { assignmentId: { in: qaAssignmentIds } } });
    await tx.placementInvitation.deleteMany({ where: { assignmentId: { in: qaAssignmentIds } } });
    await tx.placementAssignment.deleteMany({ where: { id: { in: qaAssignmentIds } } });
    await tx.publicIdentity.deleteMany({ where: { candidateId: { in: qaCandidateIds } } });
    await tx.candidate.deleteMany({ where: { id: { in: qaCandidateIds } } });
    await tx.importJob.deleteMany({ where: { testId: { in: qaTestIds } } });
    await tx.question.deleteMany({ where: { testId: { in: qaTestIds } } });
    await tx.placementBand.deleteMany({ where: { testId: { in: qaTestIds } } });
    await tx.placementTest.deleteMany({ where: { id: { in: qaTestIds } } });
    // Ephemeral, non-identity-bearing rows — every one of these was
    // created against a self-service flow that has never had real
    // production traffic (no test currently has isPublicSelfService
    // true), so all rows are safe to clear unconditionally.
    await tx.publicVerificationCode.deleteMany({});
    await tx.rateLimitEvent.deleteMany({});
  });

  console.log("");
  console.log("Applied. Re-run without --apply (dry run) to confirm nothing QA remains.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
