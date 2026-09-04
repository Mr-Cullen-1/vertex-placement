import type { ImportValidationIssue, NormalizedQuestion } from "./types";

/**
 * Pure structural validation over a `NormalizedQuestion[]` — no Prisma, no
 * Next.js. Fails loudly (returns ERROR-severity issues) rather than
 * silently coercing bad data; the caller (import.service.ts) refuses to
 * persist anything while any ERROR-severity issue is present. See
 * /docs/PHASE_2D.md "Validation".
 */
export function validateNormalizedQuestions(
  questions: readonly NormalizedQuestion[],
  expectedCount: number
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

  for (const q of questions) {
    if (q.options.length !== 4) {
      issues.push({
        questionOrder: q.order,
        message: `Expected exactly 4 options, found ${q.options.length}.`,
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
