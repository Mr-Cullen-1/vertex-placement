import ExcelJS from "exceljs";
import type { Actor } from "@/server/rbac";
import { assertPermission, hasPermission } from "@/server/rbac";
import { listCandidates } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { getAdminResultDetail } from "@/server/services/attempt.service";
import { formatDateTime } from "@/lib/format";

/**
 * Excel export — implements the workbook shape `src/domain/export/types.ts`
 * fixed in Phase 1 (`ExportSheetName`/`WorkbookSpec`) but never built.
 * Admin gets the standard sheet set (Candidates, Results, Topic Analysis);
 * Super Admin additionally gets Question Analysis — matching
 * /docs/ARCHITECTURE.md ("Excel export architecture") exactly, via the
 * existing `export:standard`/`export:full` permissions (unchanged RBAC).
 *
 * One workbook, not one file per candidate. Every number in it comes from
 * `getAdminResultDetail` (Phase 2E) — score and progression are never
 * recomputed here, only formatted into rows. No `tokenHash`, no session/
 * auth internals, no invitation plaintext ever enters a cell.
 */

const COMPLETED_ATTEMPT_STATUSES = new Set(["SUBMITTED", "AUTO_SUBMITTED"]);

export interface ExportedWorkbook {
  fileName: string;
  buffer: Buffer;
}

export async function exportPlacementWorkbook(actor: Actor): Promise<ExportedWorkbook> {
  assertPermission(actor, "export:standard");
  const includeQuestionAnalysis = hasPermission(actor.role, "export:full");

  const [candidates, assignments] = await Promise.all([
    listCandidates(actor),
    listAssignments(actor),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Vertex Placement";
  workbook.created = new Date();

  buildCandidatesSheet(workbook, candidates, assignments);

  const resultsSheet = workbook.addWorksheet("Results");
  resultsSheet.columns = [
    { header: "Candidate", key: "candidate", width: 24 },
    { header: "Test", key: "test", width: 28 },
    { header: "Score", key: "score", width: 10 },
    { header: "Total", key: "total", width: 10 },
    { header: "Percentage", key: "percentage", width: 12 },
    { header: "Progression", key: "progression", width: 20 },
    { header: "Submission type", key: "submissionType", width: 18 },
    { header: "Started", key: "startedAt", width: 20 },
    { header: "Completed", key: "completedAt", width: 20 },
    { header: "Canonical", key: "canonical", width: 12 },
  ];
  styleHeaderRow(resultsSheet);

  const topicSheet = workbook.addWorksheet("Topic Analysis");
  topicSheet.columns = [
    { header: "Candidate", key: "candidate", width: 24 },
    { header: "Test", key: "test", width: 28 },
    { header: "Topic", key: "topic", width: 20 },
    { header: "Correct", key: "correct", width: 10 },
    { header: "Total", key: "total", width: 10 },
    { header: "Percentage", key: "percentage", width: 12 },
  ];
  styleHeaderRow(topicSheet);

  const questionSheet = includeQuestionAnalysis ? workbook.addWorksheet("Question Analysis") : null;
  if (questionSheet) {
    questionSheet.columns = [
      { header: "Candidate", key: "candidate", width: 24 },
      { header: "Question #", key: "order", width: 12 },
      { header: "Selected answer", key: "selected", width: 30 },
      { header: "Correct answer", key: "correct", width: 30 },
      { header: "Result", key: "result", width: 14 },
      { header: "Difficulty band", key: "band", width: 18 },
    ];
    styleHeaderRow(questionSheet);
  }

  // One admin result-detail lookup per completed assignment's canonical
  // attempt — reuses the exact Phase 2E computation, never a second
  // scoring/progression implementation. Acceptable N+1 at MVP scale, same
  // precedent as the Assignments list (see /docs/PHASE_2F.md).
  for (const assignment of assignments) {
    const canonicalAttempt = assignment.attempts.find(
      (a) => a.isCanonical && COMPLETED_ATTEMPT_STATUSES.has(a.status)
    );
    if (!canonicalAttempt) continue;

    const detail = await getAdminResultDetail(actor, canonicalAttempt.id);
    const candidateName = `${detail.candidate.firstName} ${detail.candidate.lastName}`;

    resultsSheet.addRow({
      candidate: candidateName,
      test: detail.testTitle,
      score: detail.rawScore,
      total: detail.totalQuestions,
      percentage: Math.round(detail.percentage * 100) / 100,
      progression: detail.progression.progressionBand?.label ?? "Below Beginner",
      submissionType: detail.status === "AUTO_SUBMITTED" ? "Automatic (time limit)" : "Manual",
      startedAt: formatDateTime(detail.startedAt),
      completedAt: formatDateTime(detail.completedAt),
      canonical: detail.isCanonical ? "Yes" : "No",
    });

    for (const topic of detail.topicPerformance) {
      topicSheet.addRow({
        candidate: candidateName,
        test: detail.testTitle,
        topic: topic.topic,
        correct: topic.correct,
        total: topic.total,
        percentage: Math.round(topic.percentage * 100) / 100,
      });
    }

    if (questionSheet) {
      for (const q of detail.questionAnalysis) {
        questionSheet.addRow({
          candidate: candidateName,
          order: q.order,
          selected: q.isAnswered ? q.selectedOptionText : "—",
          correct: q.correctOptionText,
          result: !q.isAnswered ? "Unanswered" : q.isCorrect ? "Correct" : "Incorrect",
          band: q.difficultyBand ?? "Unspecified",
        });
      }
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return {
    fileName: `vertex-placement-export-${dateStamp}.xlsx`,
    buffer,
  };
}

function buildCandidatesSheet(
  workbook: ExcelJS.Workbook,
  candidates: Awaited<ReturnType<typeof listCandidates>>,
  assignments: Awaited<ReturnType<typeof listAssignments>>
) {
  const sheet = workbook.addWorksheet("Candidates");
  sheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Age", key: "age", width: 8 },
    { header: "Email", key: "email", width: 26 },
    { header: "Assignment (test)", key: "assignment", width: 28 },
    { header: "Created", key: "createdAt", width: 20 },
  ];
  styleHeaderRow(sheet);

  for (const c of candidates) {
    const own = assignments.filter((a) => a.candidateId === c.id);
    const base = {
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phoneNumber,
      age: c.age,
      email: c.email ?? "",
      createdAt: formatDateTime(c.createdAt),
    };
    if (own.length === 0) {
      sheet.addRow({ ...base, assignment: "—" });
    } else {
      for (const a of own) {
        sheet.addRow({ ...base, assignment: a.test.title });
      }
    }
  }
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
}
