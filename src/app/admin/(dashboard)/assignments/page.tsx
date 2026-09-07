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
import { InteractiveListItem, ListPanel } from "@/components/admin/interactive-list-item";
import { NewAssignmentDialog } from "@/components/admin/assignments/new-assignment-dialog";
import { ExportWorkbookButton } from "@/components/admin/assignments/export-workbook-button";
import { candidateDisplayName, formatDate, formatPercentage } from "@/lib/format";

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
  // never a second implementation. Fetched concurrently (each lookup is a
  // read-only, independent DB round-trip) rather than one at a time —
  // sequential awaits here previously made this route's load time scale
  // linearly with the number of completed assignments, which is what
  // produced a visibly "stuck" page load, not a UI problem.
  const completedAssignments = assignments.filter(
    (assignment) => displayStatusForAssignment(assignment) === "COMPLETED"
  );
  const resultSummaries = await Promise.all(
    completedAssignments.map((assignment) => getCanonicalResultSummaryForAssignment(actor, assignment.id))
  );
  const resultsByAssignmentId = new Map<
    string,
    Awaited<ReturnType<typeof getCanonicalResultSummaryForAssignment>>
  >(completedAssignments.map((assignment, i) => [assignment.id, resultSummaries[i]]));

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-6 p-4 md:p-8">
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
        <ListPanel>
          {assignments.map((assignment) => {
            const displayStatus = displayStatusForAssignment(assignment);
            const result = resultsByAssignmentId.get(assignment.id);
            const resolvedHref =
              displayStatus === "COMPLETED" && result
                ? `/admin/results/${result.attemptId}`
                : `/admin/assignments/${assignment.id}`;

            return (
              <InteractiveListItem
                key={assignment.id}
                href={resolvedHref}
                actionLabel={displayStatus === "COMPLETED" && result ? "View result" : "View assignment"}
                title={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {candidateDisplayName(assignment.candidate)}
                    {assignment.origin === "SELF_SERVICE" && (
                      <Badge variant="info" className="shrink-0">
                        <GlobeIcon />
                        Self-service
                      </Badge>
                    )}
                  </span>
                }
                subtitle={assignment.test.title}
                meta={
                  <>
                    {result && (
                      <span className="font-medium text-foreground">
                        {result.rawScore}/{result.totalQuestions} ({formatPercentage(result.percentage)})
                        {result.level ? ` · ${result.level}` : ""}
                      </span>
                    )}
                    <span>Created {formatDate(assignment.createdAt)}</span>
                  </>
                }
                status={<AssignmentStatusBadge status={displayStatus} />}
              />
            );
          })}
        </ListPanel>
      )}
    </div>
  );
}
