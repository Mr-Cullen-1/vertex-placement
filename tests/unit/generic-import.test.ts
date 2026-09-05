import { describe, expect, it } from "vitest";
import { parseGenericJsonImport, ImportParseError } from "@/domain/import/sources/generic-json";
import { hasBlockingIssues, validateImportDraft } from "@/domain/import/validate";
import type { ImportedTestDraft } from "@/domain/import/types";

function validQuestion(order: number, correctIndex = 0) {
  return {
    order,
    prompt: `Question ${order}?`,
    options: [
      { text: "Alpha", isCorrect: correctIndex === 0 },
      { text: "Beta", isCorrect: correctIndex === 1 },
      { text: "Gamma", isCorrect: correctIndex === 2 },
    ],
  };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "My Custom Placement Test",
    durationSeconds: 1200,
    questions: [validQuestion(1), validQuestion(2), validQuestion(3)],
    ...overrides,
  };
}

describe("Phase 2H — generic JSON parsing (parseGenericJsonImport)", () => {
  it("parses a valid, well-formed import file", () => {
    const draft = parseGenericJsonImport(JSON.stringify(validPayload()));
    expect(draft.title).toBe("My Custom Placement Test");
    expect(draft.durationSeconds).toBe(1200);
    expect(draft.questions).toHaveLength(3);
    expect(draft.questions[0]!.options).toHaveLength(3);
    expect(draft.placementBands).toEqual([]);
  });

  it("carries optional question metadata and placement bands through", () => {
    const draft = parseGenericJsonImport(
      JSON.stringify(
        validPayload({
          description: "A description",
          sourceAttribution: "Some Source, 2024",
          questions: [
            {
              ...validQuestion(1),
              difficultyBand: "Beginner",
              topic: "Grammar",
              tags: ["tenses"],
              sourceRef: "p.1",
              type: "single-choice",
            },
          ],
          placementBands: [{ order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 100 }],
        })
      )
    );
    expect(draft.description).toBe("A description");
    expect(draft.sourceAttribution).toBe("Some Source, 2024");
    expect(draft.questions[0]!.difficultyBand).toBe("Beginner");
    expect(draft.questions[0]!.topic).toBe("Grammar");
    expect(draft.questions[0]!.tags).toEqual(["tenses"]);
    expect(draft.placementBands).toEqual([
      { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 100, description: null },
    ]);
  });

  it("rejects malformed JSON with a friendly, non-technical message", () => {
    expect(() => parseGenericJsonImport("{ not: valid json")).toThrow(ImportParseError);
    expect(() => parseGenericJsonImport("{ not: valid json")).toThrow(/not valid JSON/i);
  });

  it("rejects a payload missing the required title field", () => {
    const payload = validPayload();
    delete (payload as Record<string, unknown>).title;
    expect(() => parseGenericJsonImport(JSON.stringify(payload))).toThrow(ImportParseError);
  });

  it("rejects an unsupported question type", () => {
    const payload = validPayload({ questions: [{ ...validQuestion(1), type: "multi-select" }] });
    expect(() => parseGenericJsonImport(JSON.stringify(payload))).toThrow(ImportParseError);
  });

  it("rejects a completely empty questions array at parse time", () => {
    expect(() => parseGenericJsonImport(JSON.stringify(validPayload({ questions: [] })))).toThrow(
      ImportParseError
    );
  });
});

describe("Phase 2H — generic import validation (validateImportDraft)", () => {
  const baseDraft: ImportedTestDraft = {
    title: "Valid Test",
    durationSeconds: 1800,
    questions: [validQuestion(1), validQuestion(2), validQuestion(3)],
    placementBands: [],
  };

  it("accepts a fully valid draft with zero issues", () => {
    expect(validateImportDraft(baseDraft)).toHaveLength(0);
  });

  it("rejects an empty question list", () => {
    const issues = validateImportDraft({ ...baseDraft, questions: [] });
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => /at least one question/i.test(i.message))).toBe(true);
  });

  it("rejects a blank title", () => {
    const issues = validateImportDraft({ ...baseDraft, title: "   " });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("rejects an out-of-range duration", () => {
    const issues = validateImportDraft({ ...baseDraft, durationSeconds: 10 });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("rejects duplicate question order numbers", () => {
    const issues = validateImportDraft({
      ...baseDraft,
      questions: [validQuestion(1), { ...validQuestion(2), order: 1 }, validQuestion(3)],
    });
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => /appears 2 times/i.test(i.message))).toBe(true);
  });

  it("rejects a question whose correct-option count is not exactly one (zero correct)", () => {
    const zeroCorrect = { ...validQuestion(1), options: validQuestion(1).options.map((o) => ({ ...o, isCorrect: false })) };
    const issues = validateImportDraft({ ...baseDraft, questions: [zeroCorrect, validQuestion(2), validQuestion(3)] });
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => i.questionOrder === 1 && /exactly 1 correct/i.test(i.message))).toBe(true);
  });

  it("rejects a question whose correct-option count is not exactly one (two correct)", () => {
    const twoCorrect = {
      ...validQuestion(1),
      options: validQuestion(1).options.map((o, i) => ({ ...o, isCorrect: i < 2 })),
    };
    const issues = validateImportDraft({ ...baseDraft, questions: [twoCorrect, validQuestion(2), validQuestion(3)] });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("rejects a question with only one option (below the generic 2-10 range)", () => {
    const oneOption = { ...validQuestion(1), options: [validQuestion(1).options[0]!] };
    const issues = validateImportDraft({ ...baseDraft, questions: [oneOption, validQuestion(2), validQuestion(3)] });
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => /between 2 and 10 options/i.test(i.message))).toBe(true);
  });

  it("accepts a question with 2 options and a question with 10 options (the generic range's edges)", () => {
    const twoOptions = { order: 1, prompt: "Two?", options: [{ text: "Yes", isCorrect: true }, { text: "No", isCorrect: false }] };
    const tenOptions = {
      order: 2,
      prompt: "Ten?",
      options: Array.from({ length: 10 }, (_, i) => ({ text: `Option ${i}`, isCorrect: i === 0 })),
    };
    const issues = validateImportDraft({ ...baseDraft, questions: [twoOptions, tenOptions] });
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("rejects invalid placement bands: minPercentage > maxPercentage", () => {
    const issues = validateImportDraft({
      ...baseDraft,
      placementBands: [{ order: 1, label: "Broken", minPercentage: 80, maxPercentage: 20 }],
    });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("rejects invalid placement bands: duplicate order", () => {
    const issues = validateImportDraft({
      ...baseDraft,
      placementBands: [
        { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 50 },
        { order: 1, label: "Advanced", minPercentage: 50, maxPercentage: 100 },
      ],
    });
    expect(hasBlockingIssues(issues)).toBe(true);
    expect(issues.some((i) => /used by more than one band/i.test(i.message))).toBe(true);
  });

  it("rejects invalid placement bands: empty label", () => {
    const issues = validateImportDraft({
      ...baseDraft,
      placementBands: [{ order: 1, label: "  ", minPercentage: 0, maxPercentage: 100 }],
    });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("accepts valid, non-overlapping placement bands", () => {
    const issues = validateImportDraft({
      ...baseDraft,
      placementBands: [
        { order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 49.9 },
        { order: 2, label: "Advanced", minPercentage: 50, maxPercentage: 100 },
      ],
    });
    expect(hasBlockingIssues(issues)).toBe(false);
  });
});
