import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listAssignments } from "@/server/services/assignment.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { getCanonicalResultSummaryForAssignment } from "@/server/services/attempt.service";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge, InvitationStatusBadge } from "@/components/admin/status-badge";
import { NewAssignmentDialog } from "@/components/admin/assignments/new-assignment-dialog";
import { ExportWorkbookButton } from "@/components/admin/assignments/export-workbook-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatPercentage } from "@/lib/format";

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
    label: `${c.firstName} ${c.lastName} — ${c.phoneNumber}`,
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
          title="No assignments yet"
          description="Create an assignment to send a candidate their invitation link."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invitation</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const displayStatus = displayStatusForAssignment(assignment);
                const latestInvitation = assignment.invitations[0] ?? null;
                const result = resultsByAssignmentId.get(assignment.id);

                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link
                        href={`/admin/assignments/${assignment.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {assignment.candidate.firstName} {assignment.candidate.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{assignment.test.title}</TableCell>
                    <TableCell>
                      <AssignmentStatusBadge status={displayStatus} />
                    </TableCell>
                    <TableCell>
                      {latestInvitation ? (
                        <InvitationStatusBadge status={latestInvitation.status} />
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {result ? (
                        <>
                          {result.rawScore}/{result.totalQuestions}{" "}
                          <span className="text-muted-foreground">
                            ({formatPercentage(result.percentage)})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {result ? result.progression.progressionBand?.label ?? "Below Beginner" : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(assignment.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/admin/assignments/${assignment.id}`} />}
                        >
                          View
                        </Button>
                        {displayStatus === "COMPLETED" && result && (
                          <Button
                            size="sm"
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={`/admin/results/${result.attemptId}`} />}
                          >
                            Result
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
