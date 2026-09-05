import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { InvalidTestStateError } from "@/server/errors";
import { LANGUAGE_HUB_QUESTIONS, LANGUAGE_HUB_SOURCE_ATTRIBUTION } from "@/domain/import/sources/language-hub-2019";
import { ImportParseError, parseGenericJsonImport } from "@/domain/import/sources/generic-json";
import {
  hasBlockingIssues,
  MAX_IMPORT_FILE_BYTES,
  validateImportDraft,
  validateNormalizedQuestions,
} from "@/domain/import/validate";
import type {
  ImportedPlacementBand,
  ImportedTestDraft,
  ImportPreview,
  ImportSourceType,
  NormalizedQuestion,
  ImportValidationIssue,
} from "@/domain/import/types";

/**
 * Import pipeline — see /docs/ARCHITECTURE.md ("Import architecture") and
 * /docs/TEST_IMPORT_FORMAT.md. Every source (the verified Language Hub
 * constant, the generic JSON upload, and any future format) converges on
 * `persistImportedTest` below for the actual database write — one
 * transactional core, not a parallel legacy/generic implementation.
 * Super Admin only (`import:write`) for every function in this file.
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
  bandCount: number;
}

/** Super Admin only. Re-validates from scratch rather than trusting the
 * result of an earlier `previewLanguageHubImport` call — the same
 * "never trust a client-echoed prior check" posture the generic pipeline
 * below uses. */
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

  return persistImportedTest({
    actor,
    title: LANGUAGE_HUB_TEST_TITLE,
    description: "Macmillan Education Placement Test — Language Hub Beginner to Advanced (70 questions).",
    sourceAttribution: LANGUAGE_HUB_SOURCE_ATTRIBUTION,
    durationSeconds: DURATION_SECONDS,
    questions: LANGUAGE_HUB_QUESTIONS,
    placementBands: [],
    sourceType: "PDF",
    fileName: LANGUAGE_HUB_FILE_NAME,
    fileRef: LANGUAGE_HUB_FILE_REF,
  });
}

// --- Generic JSON import (Phase 2H) ---------------------------------------

export interface GenericImportPreview extends ImportPreview {
  title: string;
  durationSeconds: number;
  bandCount: number;
  fileName: string;
  /** A test with this title already exists. Unlike the Language Hub
   * singleton dataset, this is a WARNING, not a blocking ERROR — the
   * admin may still confirm and create a second test with the same
   * title (see /docs/TEST_IMPORT_FORMAT.md "Duplicate titles"). It is
   * surfaced separately from `issues` so the UI can render it as its own
   * callout rather than one more generic validation line. */
  titleConflict: boolean;
}

function parseAndValidate(fileContent: string): { draft: ImportedTestDraft; issues: ImportValidationIssue[] } {
  let draft: ImportedTestDraft;
  try {
    draft = parseGenericJsonImport(fileContent);
  } catch (error) {
    const message = error instanceof ImportParseError ? error.message : "Could not parse the import file.";
    return {
      draft: { title: "", durationSeconds: 0, questions: [] },
      issues: [{ questionOrder: null, message, severity: "ERROR" }],
    };
  }
  return { draft, issues: validateImportDraft(draft) };
}

function assertFileSize(fileContent: string): void {
  if (Buffer.byteLength(fileContent, "utf8") > MAX_IMPORT_FILE_BYTES) {
    throw new InvalidTestStateError(
      `Import file is too large (max ${Math.round(MAX_IMPORT_FILE_BYTES / 1024 / 1024)}MB).`
    );
  }
}

/** Super Admin only. Parses and validates an uploaded JSON file — never
 * persists anything. `fileContent` is the raw file text, read client-side
 * (`file.text()`) and passed through as a plain string, matching this
 * app's existing Server Action convention of plain-argument actions
 * rather than FormData/Blob plumbing. */
export async function previewGenericImport(
  actor: Actor,
  fileName: string,
  fileContent: string
): Promise<GenericImportPreview> {
  assertPermission(actor, "import:write");
  assertFileSize(fileContent);

  const { draft, issues } = parseAndValidate(fileContent);
  const existing = draft.title
    ? await db.placementTest.findFirst({ where: { title: draft.title }, select: { id: true } })
    : null;

  return {
    questions: draft.questions,
    issues,
    isImportable: !hasBlockingIssues(issues),
    title: draft.title,
    durationSeconds: draft.durationSeconds,
    bandCount: draft.placementBands?.length ?? 0,
    fileName,
    titleConflict: Boolean(existing),
  };
}

/** Super Admin only. Re-parses and re-validates `fileContent` from
 * scratch rather than trusting a client-echoed preview result — the
 * server never assumes a file it validated a moment ago for `preview`
 * is the same file (or unmodified) by the time `confirm` is called. */
export async function confirmGenericImport(
  actor: Actor,
  fileName: string,
  fileContent: string
): Promise<ImportResult> {
  assertPermission(actor, "import:write");
  assertFileSize(fileContent);

  const { draft, issues } = parseAndValidate(fileContent);
  if (hasBlockingIssues(issues)) {
    throw new InvalidTestStateError(
      `Import validation failed: ${issues.map((i) => i.message).join("; ")}`
    );
  }

  return persistImportedTest({
    actor,
    title: draft.title,
    description: draft.description ?? null,
    sourceAttribution: draft.sourceAttribution ?? null,
    durationSeconds: draft.durationSeconds,
    questions: draft.questions,
    placementBands: draft.placementBands ?? [],
    sourceType: "JSON",
    fileName,
    fileRef: fileName,
  });
}

// --- Shared persistence ----------------------------------------------------

interface PersistImportedTestParams {
  actor: Actor;
  title: string;
  description: string | null;
  sourceAttribution: string | null;
  durationSeconds: number;
  questions: readonly NormalizedQuestion[];
  placementBands: readonly ImportedPlacementBand[];
  sourceType: ImportSourceType;
  fileName: string;
  fileRef: string;
}

/**
 * The one transactional core every import source persists through.
 * Either the test + every question/option/metadata row + every
 * placement band + the ImportJob row are all created, or nothing is —
 * a failure partway through rolls back the entire transaction.
 *
 * Imported questions are created PUBLISHED (their content already
 * passed structural validation and, for Language Hub, was manually
 * verified against the source) — matching the behavior this pipeline
 * has had since Phase 2D. This is deliberate and safe, not an oversight:
 * `PlacementTest` is always created DRAFT here regardless of question
 * status, and a DRAFT test can never be assigned to or attempted by a
 * student (`assignment.service.ts`, `attempt.service.ts` both gate on
 * `test.status === "PUBLISHED"`) — so nothing imported is reachable
 * until a Super Admin takes the separate, explicit "Publish" action on
 * the test itself. The alternative (importing questions as DRAFT) would
 * force publishing every question one at a time before the test could
 * ever go live, with no product benefit — the safety boundary the
 * product actually wants is at the test level, not the question level.
 * See /docs/ARCHITECTURE.md ("Import architecture").
 */
async function persistImportedTest(params: PersistImportedTestParams): Promise<ImportResult> {
  const { actor, title, description, sourceAttribution, durationSeconds, questions, placementBands } = params;

  const testId = await db.$transaction(
    async (tx) => {
      const test = await tx.placementTest.create({
        data: {
          title,
          description,
          sourceAttribution,
          status: "DRAFT",
          durationSeconds,
          totalQuestionCount: questions.length,
          createdByUserId: actor.userId,
        },
      });

      for (const q of questions) {
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

      for (const band of placementBands) {
        await tx.placementBand.create({
          data: {
            testId: test.id,
            order: band.order,
            label: band.label,
            minPercentage: band.minPercentage,
            maxPercentage: band.maxPercentage,
            description: band.description ?? null,
          },
        });
      }

      await tx.importJob.create({
        data: {
          sourceType: params.sourceType,
          fileName: params.fileName,
          fileRef: params.fileRef,
          status: "IMPORTED",
          testId: test.id,
          createdByUserId: actor.userId,
          previewData: {
            questionCount: questions.length,
            optionCount: questions.reduce((sum, q) => sum + q.options.length, 0),
            bandCount: placementBands.length,
            sourceAttribution,
          },
        },
      });

      return test.id;
    },
    // A large import comfortably clears Prisma's default 5s interactive-
    // transaction timeout on a low-latency connection, but needs real
    // headroom here — a slow/high-latency database connection otherwise
    // aborts the transaction partway through, which then surfaces as a
    // confusing foreign-key-violation on the next statement rather than a
    // clear timeout error. This is a one-time, explicitly-triggered admin
    // action, not a per-request path, so a generous timeout is
    // appropriate rather than over-engineering (e.g. batching) an
    // operation that only ever runs once per import.
    { timeout: 600_000, maxWait: 20_000 }
  );

  return {
    testId,
    questionCount: questions.length,
    optionCount: questions.reduce((sum, q) => sum + q.options.length, 0),
    bandCount: placementBands.length,
  };
}
