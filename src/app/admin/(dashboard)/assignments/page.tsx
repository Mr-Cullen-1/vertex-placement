import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listAssignments } from "@/server/services/assignment.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { getCanonicalResultSummaryForAssignment } from "@/server/services/attempt.service";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { GlobeIcon, SendIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { MobileRecordCard } from "@/components/admin/mobile-record-card";
import { NewAssignmentDialog } from "@/components/admin/assignments/new-assignment-dialog";
import { ExportWorkbookButton } from "@/components/admin/assignments/export-workbook-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { candidateDisplayName, formatDate, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string }>;
}) {
  const { candidateId } = await searchParams;
  const actor = await getActorOrThrow();
  const [assignments, candidates, tests] = await Promise.all([
    listAssignments(actor),
    listCandidates(actor),
    listPlacementTests(actor),
  ]);

  const candidateOptions = candidates.map((c) => ({
    id: c.id,
    label: c.profileCompletedAt
      ? `${c.firstName} ${c.lastName} — ${c.phoneNumber}`
      : `${candidateDisplayName(c)} (added ${formatDate(c.createdAt)})`,
  }));
  const publishedTests = tests
    .filter((t) => t.status === "PUBLISHED")
    .map((t) => ({ id: t.id, title: t.title }));

  // One result-summary lookup per COMPLETED assignment — reuses Phase 2E's
  // scoring/progression computation directly (see attempt.service.ts),
  // never a second implementation. Fine at MVP scale (see /docs/PHASE_2F.md).
  const resultsByAssignmentId = new Map<
    string,
    Awaited<ReturnType<typeof getCanonicalResultSummaryForAssignment>>
  >();
  for (const assignment of assignments) {
    if (displayStatusForAssignment(assignment) !== "COMPLETED") continue;
    const summary = await getCanonicalResultSummaryForAssignment(actor, assignment.id);
    resultsByAssignmentId.set(assignment.id, summary);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Operations"
        title="Assignments"
        description="Candidate + test pairings, and the invitations issued for them."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ExportWorkbookButton />
            <NewAssignmentDialog
              candidates={candidateOptions}
              publishedTests={publishedTests}
              initialCandidateId={candidateId}
              autoOpen={Boolean(candidateId)}
            />
          </div>
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={SendIcon}
          title="No assignments yet"
          description="Create an assignment to send a candidate their invitation link."
        />
      ) : (
        <>
          {/* Full table only once there's genuinely enough width for it to
           * breathe — below that, MobileRecordCard (see /docs/DESIGN_SYSTEM.md
           * "No horizontal scrolling"). `table-fixed` + explicit column
           * percentages (rather than the browser's auto layout) is what
           * actually keeps this within the viewport: content is allowed to
           * wrap/truncate inside its own cell instead of forcing the table
           * itself wider. The Invitation column was dropped from this list
           * entirely (still visible on the assignment detail page) —
           * secondary metadata that doesn't need its own column here. */}
          <div className="hidden lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[27%]">Candidate</TableHead>
                  <TableHead className="w-[23%]">Test</TableHead>
                  <TableHead className="w-[13%]">Status</TableHead>
                  <TableHead className="w-[17%]">Result</TableHead>
                  <TableHead className="w-[10%]">Created</TableHead>
                  <TableHead className="w-[10%] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const displayStatus = displayStatusForAssignment(assignment);
                  const result = resultsByAssignmentId.get(assignment.id);

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="whitespace-normal">
                        <div className="flex min-w-0 flex-col gap-1">
                          <Link
                            href={`/admin/assignments/${assignment.id}`}
                            className={cn(
                              "truncate font-semibold hover:underline",
                              assignment.candidate.profileCompletedAt
                                ? "text-foreground"
                                : "text-muted-foreground italic"
                            )}
                          >
                            {candidateDisplayName(assignment.candidate)}
                          </Link>
                          {assignment.origin === "SELF_SERVICE" && (
                            <Badge variant="info" className="w-fit">
                              <GlobeIcon />
                              Self-service
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="block truncate">{assignment.test.title}</span>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <AssignmentStatusBadge status={displayStatus} />
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {result ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">
                              {result.rawScore}/{result.totalQuestions}{" "}
                              <span className="font-normal text-muted-foreground">
                                ({formatPercentage(result.percentage)})
                              </span>
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {result.level ?? "No level configured"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {formatDate(assignment.createdAt)}
                      </TableCell>
                      <TableCell className="text-right whitespace-normal">
                        {displayStatus === "COMPLETED" && result ? (
                          <Button
                            size="sm"
                            nativeButton={false}
                            render={<Link href={`/admin/results/${result.attemptId}`} />}
                          >
                            Result
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={<Link href={`/admin/assignments/${assignment.id}`} />}
                          >
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden">
            {assignments.map((assignment) => {
              const displayStatus = displayStatusForAssignment(assignment);
              const result = resultsByAssignmentId.get(assignment.id);
              return (
                <li key={assignment.id}>
                  <MobileRecordCard
                    href={
                      displayStatus === "COMPLETED" && result
                        ? `/admin/results/${result.attemptId}`
                        : `/admin/assignments/${assignment.id}`
                    }
                    title={candidateDisplayName(assignment.candidate)}
                    subtitle={assignment.test.title}
                    meta={
                      <>
                        <AssignmentStatusBadge status={displayStatus} />
                        {assignment.origin === "SELF_SERVICE" && (
                          <Badge variant="info">
                            <GlobeIcon />
                            Self-service
                          </Badge>
                        )}
                        {result && (
                          <span className="text-xs font-medium text-foreground">
                            {result.rawScore}/{result.totalQuestions} ({formatPercentage(result.percentage)})
                          </span>
                        )}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
