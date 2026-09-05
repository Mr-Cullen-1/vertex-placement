/**
 * Import pipeline: source file -> format-specific parser -> one shared
 * normalized shape (`ImportedTestDraft`) -> validation -> preview ->
 * confirm -> PlacementTest + Question + Option + QuestionMetadata (+
 * PlacementBand) rows -> explicit publish action. A parser's only job is
 * turning a source file into an `ImportedTestDraft`; everything after
 * that (validation, preview, persistence) is format-agnostic and shared
 * by every source. See /docs/ARCHITECTURE.md ("Import architecture") and
 * /docs/TEST_IMPORT_FORMAT.md (the JSON format itself).
 */

export type ImportSourceType = "PDF" | "XLSX" | "JSON" | "DOCX";

export interface NormalizedOption {
  text: string;
  isCorrect: boolean;
}

export interface NormalizedQuestion {
  order: number;
  prompt: string;
  options: NormalizedOption[];
  difficultyBand?: string;
  topic?: string;
  tags?: string[];
  sourceRef?: string;
}

/** A `PlacementBand` produced by an import source — same shape as
 * `CreateBandInput` (`placement-band.service.ts`), kept as its own type
 * here so the domain layer never imports the Zod schema from the
 * server layer. */
export interface ImportedPlacementBand {
  order: number;
  label: string;
  minPercentage: number;
  maxPercentage: number;
  description?: string | null;
}

/**
 * The one canonical shape every import source converges on — a whole
 * test definition, not just its questions. External parsers (the
 * Language Hub constant, the generic JSON parser, and any future
 * CSV/XLSX/PDF/AI-assisted source) each produce one of these; the
 * validator and persistence pipeline never know or care which source
 * produced it.
 */
export interface ImportedTestDraft {
  title: string;
  description?: string | null;
  sourceAttribution?: string | null;
  durationSeconds: number;
  questions: NormalizedQuestion[];
  placementBands?: ImportedPlacementBand[];
}

export interface ImportValidationIssue {
  questionOrder: number | null; // null = file/test-level issue
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ImportPreview {
  questions: NormalizedQuestion[];
  issues: ImportValidationIssue[];
  isImportable: boolean; // false if any ERROR-severity issue is present
}
