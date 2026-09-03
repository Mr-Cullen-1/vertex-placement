/**
 * Excel export architecture. Not implemented in Phase 0 — see
 * /docs/ARCHITECTURE.md ("Excel export"). Admin exports get the
 * "standard" sheet set; Super Admin exports get the full set.
 */

export type ExportSheetName =
  | "Candidates"
  | "Results"
  | "Question Analysis" // Super Admin only
  | "Topic Analysis";

export interface ExportRequest {
  testId: string;
  requestedByRole: "ADMIN" | "SUPER_ADMIN";
  dateRange?: { from: string; to: string };
}

export interface WorkbookSpec {
  sheets: ExportSheetName[];
  fileName: string;
}
