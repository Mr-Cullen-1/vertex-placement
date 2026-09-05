import type { ImportedPlacementBand, ImportedTestDraft, ImportValidationIssue, NormalizedQuestion } from "./types";

/** Untrusted upload — never trust client-side size checks alone, but the
 * client (the import dialog) also reads this same constant so it can
 * reject an oversized file before ever reading/uploading it. Lives here
 * (not in `import.service.ts`, which imports `db` and is server-only)
 * specifically so a "use client" component can import it directly. 2MB
 * comfortably covers a several-hundred-question JSON file — the existing
 * 70-question Language Hub source, serialized this way, is well under
 * 100KB — while still bounding worst-case parse/validation work. */
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Pure structural validation over a `NormalizedQuestion[]` — no Prisma, no
 * Next.js. Fails loudly (returns ERROR-severity issues) rather than
 * silently coercing bad data; the caller (import.service.ts) refuses to
 * persist anything while any ERROR-severity issue is present. See
 * /docs/PHASE_2D.md "Validation".
 *
 * `optionRange` defaults to `{ min: 4, max: 4 }` — the Language Hub
 * source's own fixed shape, and the only caller of this function until
 * Phase 2H. The generic JSON importer (`import.service.ts`) passes
 * `{ min: 2, max: 10 }`, matching the same option-count range manual
 * question authoring already allows (`question.service.ts`'s
 * `createQuestionSchema`) — this function's default is left unchanged
 * specifically so every existing call site (including the Language Hub
 * regression tests) keeps its exact prior behavior without passing a
 * third argument.
 */
export function validateNormalizedQuestions(
  questions: readonly NormalizedQuestion[],
  expectedCount: number,
  optionRange: { min: number; max: number } = { min: 4, max: 4 }
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  if (questions.length !== expectedCount) {
    issues.push({
      questionOrder: null,
      message: `Expected exactly ${expectedCount} questions, found ${questions.length}.`,
      severity: "ERROR",
    });
  }

  const seenOrders = new Map<number, number>();
  for (const q of questions) {
    seenOrders.set(q.order, (seenOrders.get(q.order) ?? 0) + 1);
  }
  for (const [order, count] of seenOrders) {
    if (count > 1) {
      issues.push({
        questionOrder: order,
        message: `Question order ${order} appears ${count} times (must be unique).`,
        severity: "ERROR",
      });
    }
  }
  for (let i = 1; i <= expectedCount; i++) {
    if (!seenOrders.has(i)) {
      issues.push({
        questionOrder: i,
        message: `Missing question order ${i} — question numbers must run 1..${expectedCount} with no gaps.`,
        severity: "ERROR",
      });
    }
  }

  const { min: minOptions, max: maxOptions } = optionRange;
  const optionCountLabel =
    minOptions === maxOptions ? `exactly ${minOptions}` : `between ${minOptions} and ${maxOptions}`;

  for (const q of questions) {
    if (q.options.length < minOptions || q.options.length > maxOptions) {
      issues.push({
        questionOrder: q.order,
        message: `Expected ${optionCountLabel} options, found ${q.options.length}.`,
        severity: "ERROR",
      });
    }

    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      issues.push({
        questionOrder: q.order,
        message: `Expected exactly 1 correct option, found ${correctCount}.`,
        severity: "ERROR",
      });
    }

    const optionTexts = q.options.map((o) => o.text.trim());
    const uniqueTexts = new Set(optionTexts);
    if (uniqueTexts.size !== optionTexts.length) {
      issues.push({
        questionOrder: q.order,
        message: "Duplicate option text within the same question.",
        severity: "ERROR",
      });
    }

    if (q.prompt.trim() === "") {
      issues.push({ questionOrder: q.order, message: "Empty prompt.", severity: "ERROR" });
    }
    for (const [index, option] of q.options.entries()) {
      if (option.text.trim() === "") {
        issues.push({
          questionOrder: q.order,
          message: `Option ${index + 1} has empty text.`,
          severity: "ERROR",
        });
      }
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: readonly ImportValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "ERROR");
}

/** Product-wide authoring constraint (see `question.service.ts`'s
 * `createQuestionSchema`) — the generic importer is held to the exact
 * same option-count range manual question authoring already enforces,
 * not a stricter or looser rule invented just for import. */
export const GENERIC_IMPORT_OPTION_RANGE = { min: 2, max: 10 } as const;

/** The only question type the student test renderer supports today
 * (`placement-question.tsx`: a single `role="radiogroup"` of options) —
 * see /docs/TEST_IMPORT_FORMAT.md. A source file may omit `type`
 * (defaults to this), but must not claim any other type. */
export const SUPPORTED_QUESTION_TYPE = "single-choice";

/**
 * Whole-draft validation for the generic import pipeline — title,
 * duration, the question array (via `validateNormalizedQuestions` with
 * the generic option range), and placement bands. Never touches
 * Language Hub's own validation path (that still calls
 * `validateNormalizedQuestions` directly with its stricter, fixed
 * 4-option/70-question shape) — see the module doc above.
 */
export function validateImportDraft(draft: ImportedTestDraft): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  if (draft.title.trim() === "") {
    issues.push({ questionOrder: null, message: "Title is required.", severity: "ERROR" });
  } else if (draft.title.trim().length > 200) {
    issues.push({
      questionOrder: null,
      message: "Title must be 200 characters or fewer.",
      severity: "ERROR",
    });
  }

  if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 60 || draft.durationSeconds > 24 * 60 * 60) {
    issues.push({
      questionOrder: null,
      message: "durationSeconds must be a whole number between 60 and 86400 (24 hours).",
      severity: "ERROR",
    });
  }

  if (draft.questions.length === 0) {
    issues.push({
      questionOrder: null,
      message: "At least one question is required.",
      severity: "ERROR",
    });
  } else {
    issues.push(
      ...validateNormalizedQuestions(draft.questions, draft.questions.length, GENERIC_IMPORT_OPTION_RANGE)
    );
  }

  issues.push(...validateImportedPlacementBands(draft.placementBands ?? []));

  return issues;
}

function validateImportedPlacementBands(
  bands: readonly ImportedPlacementBand[]
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  const seenOrders = new Set<number>();

  for (const band of bands) {
    const label = `Placement band "${band.label || "(untitled)"}"`;

    if (!band.label || band.label.trim() === "") {
      issues.push({ questionOrder: null, message: "A placement band has an empty label.", severity: "ERROR" });
    } else if (band.label.trim().length > 100) {
      issues.push({ questionOrder: null, message: `${label}: label must be 100 characters or fewer.`, severity: "ERROR" });
    }

    if (!Number.isInteger(band.order) || band.order < 0) {
      issues.push({ questionOrder: null, message: `${label}: order must be a non-negative whole number.`, severity: "ERROR" });
    } else if (seenOrders.has(band.order)) {
      issues.push({ questionOrder: null, message: `${label}: order ${band.order} is used by more than one band.`, severity: "ERROR" });
    } else {
      seenOrders.add(band.order);
    }

    const { minPercentage, maxPercentage } = band;
    if (
      typeof minPercentage !== "number" ||
      typeof maxPercentage !== "number" ||
      minPercentage < 0 ||
      maxPercentage > 100 ||
      Number.isNaN(minPercentage) ||
      Number.isNaN(maxPercentage)
    ) {
      issues.push({
        questionOrder: null,
        message: `${label}: minPercentage/maxPercentage must be numbers between 0 and 100.`,
        severity: "ERROR",
      });
    } else if (minPercentage > maxPercentage) {
      issues.push({
        questionOrder: null,
        message: `${label}: minPercentage (${minPercentage}) must be <= maxPercentage (${maxPercentage}).`,
        severity: "ERROR",
      });
    }
  }

  return issues;
}
