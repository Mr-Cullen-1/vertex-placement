import { z } from "zod";
import type { ImportedTestDraft } from "../types";
import { SUPPORTED_QUESTION_TYPE } from "../validate";

/**
 * The generic, structured import format for Phase 2H — see
 * /docs/TEST_IMPORT_FORMAT.md for the full documented schema with an
 * example file. Field names deliberately match the internal
 * `NormalizedQuestion`/`ImportedPlacementBand` shapes 1:1 (`difficultyBand`,
 * `topic`, `tags`, `sourceRef`, `minPercentage`, ...) so this schema is a
 * thin, honest parse of the file — not a translation layer hiding a
 * different internal model.
 *
 * `type` is optional per question and, if present, must be
 * `"single-choice"` — the only question type the student test renderer
 * (`placement-question.tsx`) supports. Any other value is a validation
 * error, not a silently-ignored/best-effort field (see /docs/PHASE_2H
 * plan section 14 — "do not accept unsupported types and hope they
 * render").
 */
const optionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  order: z.number().int().min(1),
  prompt: z.string().trim().min(1).max(2000),
  type: z.literal(SUPPORTED_QUESTION_TYPE).optional(),
  // Deliberately wider than the real 2-10 business rule
  // (`GENERIC_IMPORT_OPTION_RANGE` in validate.ts) — this schema only
  // rejects shapes too malformed to even attempt validating (e.g. an
  // empty array); the actual option-count rule is enforced afterward by
  // `validateNormalizedQuestions` so the admin sees "Question 5:
  // Expected between 2 and 10 options, found 1" instead of a generic
  // schema-parse error.
  options: z.array(optionSchema).min(1).max(20),
  difficultyBand: z.string().trim().max(100).optional(),
  topic: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  sourceRef: z.string().trim().max(200).optional(),
});

const placementBandSchema = z.object({
  order: z.number().int().min(0),
  label: z.string().trim().min(1).max(100),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
});

const importedTestJsonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  sourceAttribution: z.string().trim().max(500).optional().nullable(),
  durationSeconds: z.number().int().min(60).max(24 * 60 * 60),
  // A generous but real ceiling — well past any plausible placement test
  // (the existing Language Hub source has 70) and far under anything that
  // would make the single import transaction impractical.
  questions: z.array(questionSchema).min(1).max(500),
  placementBands: z.array(placementBandSchema).max(20).optional(),
});

/** Thrown for both "not valid JSON" and "valid JSON but doesn't match the
 * expected shape" — the caller (`import.service.ts`) catches this and
 * turns it into an admin-readable `ImportValidationIssue`, never a raw
 * parser/Zod stack trace. */
export class ImportParseError extends Error {}

/**
 * Parses and structurally validates raw JSON file content into an
 * `ImportedTestDraft`. This is parsing only — it does NOT run the
 * shared `validateImportDraft` business-rule checks (duplicate question
 * order, exactly-one-correct-option, band overlaps, ...); the caller
 * runs those separately so a parse-level error and a validation-level
 * issue are never conflated into the same message.
 */
export function parseGenericJsonImport(raw: string): ImportedTestDraft {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ImportParseError(
      "The file is not valid JSON. Check for a missing bracket, brace, comma, or quote."
    );
  }

  const result = importedTestJsonSchema.safeParse(json);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join(".") || "(top level)";
    throw new ImportParseError(`Invalid import file at "${path}": ${firstIssue?.message ?? "unknown error"}.`);
  }

  const data = result.data;
  return {
    title: data.title,
    description: data.description ?? null,
    sourceAttribution: data.sourceAttribution ?? null,
    durationSeconds: data.durationSeconds,
    questions: data.questions.map((q) => ({
      order: q.order,
      prompt: q.prompt,
      options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      difficultyBand: q.difficultyBand,
      topic: q.topic,
      tags: q.tags,
      sourceRef: q.sourceRef,
    })),
    placementBands: (data.placementBands ?? []).map((b) => ({
      order: b.order,
      label: b.label,
      minPercentage: b.minPercentage,
      maxPercentage: b.maxPercentage,
      description: b.description ?? null,
    })),
  };
}
