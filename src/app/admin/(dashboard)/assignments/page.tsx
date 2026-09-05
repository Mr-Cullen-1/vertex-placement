import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listAssignments } from "@/server/services/assignment.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { getCanonicalResultSummaryForAssignment } from "@/server/services/attempt.service";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { SendIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge, InvitationStatusBadge } from "@/components/admin/status-badge";
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
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invitation</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                          className={cn(
                            "font-semibold hover:underline",
                            assignment.candidate.profileCompletedAt
                              ? "text-foreground"
                              : "text-muted-foreground italic"
                          )}
                        >
                          {candidateDisplayName(assignment.candidate)}
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
                      <TableCell className="whitespace-nowrap font-medium text-foreground">
                        {result ? (
                          <>
                            {result.rawScore}/{result.totalQuestions}{" "}
                            <span className="font-normal text-muted-foreground">
                              ({formatPercentage(result.percentage)})
                            </span>
                          </>
                        ) : (
                          <span className="font-normal text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {result ? result.level ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(assignment.createdAt)}</TableCell>
                      <TableCell className="text-right">
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

          <ul className="flex flex-col gap-2 xl:hidden">
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
