/**
 * Import pipeline: source file -> parser -> NormalizedQuestion[] ->
 * validation -> preview -> confirm -> Question rows (DRAFT) -> publish.
 * A parser's only job is producing NormalizedQuestion[]; everything after
 * that is format-agnostic. See /docs/ARCHITECTURE.md ("Import system").
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

export interface ImportValidationIssue {
  questionOrder: number | null; // null = file-level issue
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ImportPreview {
  questions: NormalizedQuestion[];
  issues: ImportValidationIssue[];
  isImportable: boolean; // false if any ERROR-severity issue is present
}

/** A parser implementation for one ImportSourceType. Every format
 * converges on the same NormalizedQuestion[] contract. */
export interface QuestionParser {
  sourceType: ImportSourceType;
  parse: (fileBuffer: Buffer) => Promise<NormalizedQuestion[]>;
}
