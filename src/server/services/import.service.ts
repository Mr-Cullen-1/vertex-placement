import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { InvalidTestStateError } from "@/server/errors";
import { LANGUAGE_HUB_QUESTIONS, LANGUAGE_HUB_SOURCE_ATTRIBUTION } from "@/domain/import/sources/language-hub-2019";
import { hasBlockingIssues, validateNormalizedQuestions } from "@/domain/import/validate";
import type { ImportPreview } from "@/domain/import/types";

/**
 * Import pipeline for the Language Hub Beginner to Advanced placement
 * test (see /docs/PHASE_2D.md). Super Admin only (`import:write`).
 *
 * There is no runtime file upload here — the source PDF's inline blanks
 * are not recoverable from an automated text/layout extraction (a
 * structural limitation of the format, not a shortcut), so the verified
 * question set is a manually-transcribed, cross-checked constant
 * (`LANGUAGE_HUB_QUESTIONS`) rather than something parsed from a Buffer
 * at request time. The pipeline still goes through the same
 * normalize -> validate -> preview -> confirm stages the domain contract
 * (`src/domain/import/types.ts`) defines for any future source.
 */

export const LANGUAGE_HUB_TEST_TITLE = "Language Hub Placement Test";
const LANGUAGE_HUB_FILE_NAME = "Language_Hub_Placement_Test_with_key.pdf";
const LANGUAGE_HUB_FILE_REF = "language-hub-placement-test-2019";
const EXPECTED_QUESTION_COUNT = 70;
const DURATION_SECONDS = 30 * 60;

export interface LanguageHubImportPreview extends ImportPreview {
  alreadyImported: boolean;
  existingTestId: string | null;
  testTitle: string;
  durationSeconds: number;
}

export async function previewLanguageHubImport(actor: Actor): Promise<LanguageHubImportPreview> {
  assertPermission(actor, "import:write");

  const issues = validateNormalizedQuestions(LANGUAGE_HUB_QUESTIONS, EXPECTED_QUESTION_COUNT);
  const existing = await db.placementTest.findFirst({
    where: { title: LANGUAGE_HUB_TEST_TITLE },
    select: { id: true },
  });

  return {
    questions: LANGUAGE_HUB_QUESTIONS as ImportPreview["questions"],
    issues,
    isImportable: !hasBlockingIssues(issues) && !existing,
    alreadyImported: Boolean(existing),
    existingTestId: existing?.id ?? null,
    testTitle: LANGUAGE_HUB_TEST_TITLE,
    durationSeconds: DURATION_SECONDS,
  };
}

export interface ImportResult {
  testId: string;
  questionCount: number;
  optionCount: number;
}

/** Transactional: a failed import leaves no partial test/questions/
 * options behind. Imported questions are created as PUBLISHED (their
 * content is final/verified) so the test can be published in one action
 * afterward — but the PlacementTest itself is always created DRAFT and
 * is never published here. A DRAFT test is not reachable by students
 * regardless of its questions' individual status (attempt.service.ts
 * gates on test.status, not question.status), so this is safe. */
export async function confirmLanguageHubImport(actor: Actor): Promise<ImportResult> {
  assertPermission(actor, "import:write");

  const issues = validateNormalizedQuestions(LANGUAGE_HUB_QUESTIONS, EXPECTED_QUESTION_COUNT);
  if (hasBlockingIssues(issues)) {
    throw new InvalidTestStateError(
      `Import validation failed: ${issues.map((i) => i.message).join("; ")}`
    );
  }

  const existing = await db.placementTest.findFirst({
    where: { title: LANGUAGE_HUB_TEST_TITLE },
    select: { id: true },
  });
  if (existing) {
    throw new InvalidTestStateError(
      `"${LANGUAGE_HUB_TEST_TITLE}" has already been imported (test ${existing.id}). Manage it from Test Management instead of re-importing.`
    );
  }

  const testId = await db.$transaction(
    async (tx) => {
      const test = await tx.placementTest.create({
        data: {
          title: LANGUAGE_HUB_TEST_TITLE,
          description:
            "Macmillan Education Placement Test — Language Hub Beginner to Advanced (70 questions).",
          sourceAttribution: LANGUAGE_HUB_SOURCE_ATTRIBUTION,
          status: "DRAFT",
          durationSeconds: DURATION_SECONDS,
          totalQuestionCount: EXPECTED_QUESTION_COUNT,
          createdByUserId: actor.userId,
        },
      });

      for (const q of LANGUAGE_HUB_QUESTIONS) {
        await tx.question.create({
          data: {
            testId: test.id,
            order: q.order,
            prompt: q.prompt,
            status: "PUBLISHED",
            options: {
              create: q.options.map((o, index) => ({
                text: o.text,
                isCorrect: o.isCorrect,
                order: index + 1,
              })),
            },
            metadata: {
              create: {
                difficultyBand: q.difficultyBand ?? null,
                topic: q.topic ?? null,
                tags: q.tags ?? [],
                sourceRef: q.sourceRef ?? null,
              },
            },
          },
        });
      }

      await tx.importJob.create({
        data: {
          sourceType: "PDF",
          fileName: LANGUAGE_HUB_FILE_NAME,
          fileRef: LANGUAGE_HUB_FILE_REF,
          status: "IMPORTED",
          testId: test.id,
          createdByUserId: actor.userId,
          previewData: {
            questionCount: EXPECTED_QUESTION_COUNT,
            optionCount: EXPECTED_QUESTION_COUNT * 4,
            sourceAttribution: LANGUAGE_HUB_SOURCE_ATTRIBUTION,
          },
        },
      });

      return test.id;
    },
    // 70 sequential nested creates comfortably clear Prisma's default 5s
    // interactive-transaction timeout on a low-latency connection, but
    // need real headroom here — a slow/high-latency database connection
    // otherwise aborts the transaction partway through, which then
    // surfaces as a confusing foreign-key-violation on the next
    // statement rather than a clear timeout error. This is a one-time,
    // explicitly-triggered admin action, not a per-request path, so a
    // generous timeout is appropriate rather than over-engineering
    // (e.g. batching) an operation that only ever runs once.
    { timeout: 600_000, maxWait: 20_000 }
  );

  return {
    testId,
    questionCount: EXPECTED_QUESTION_COUNT,
    optionCount: EXPECTED_QUESTION_COUNT * 4,
  };
}
