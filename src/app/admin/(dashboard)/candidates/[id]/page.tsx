import Link from "next/link";
import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getCandidate } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { getCanonicalResultSummaryForAssignment } from "@/server/services/attempt.service";
import { CandidateNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { IdCardIcon, SendIcon } from "lucide-react";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InteractiveListItem } from "@/components/admin/interactive-list-item";
import { candidateDisplayName, formatDate, formatPercentage } from "@/lib/format";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActorOrThrow();

  let candidate;
  try {
    candidate = await getCandidate(actor, id);
  } catch (error) {
    if (error instanceof CandidateNotFoundError) notFound();
    throw error;
  }

  const allAssignments = await listAssignments(actor);
  const assignments = allAssignments.filter((a) => a.candidateId === id);
  const isPending = !candidate.profileCompletedAt;

  // Fetched concurrently rather than one at a time — see the identical
  // fix on the Assignments/Candidates list pages for why sequential
  // awaits here previously made this route's load time scale linearly
  // with the candidate's own assignment count.
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
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 md:p-8 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Candidate"
        title={candidateDisplayName(candidate)}
        backHref="/admin/candidates"
        backLabel="Candidates"
        action={
          <Button size="sm" nativeButton={false} render={<Link href={`/admin/assignments?candidateId=${candidate.id}`} />}>
            New assignment
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardHeading icon={IdCardIcon} title="Candidate information" />
          <CardContent>
            {isPending ? (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Awaiting student details — this candidate hasn&apos;t opened their invitation and
                entered their information yet.
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="Phone" value={candidate.phoneNumber} />
                <Stat label="Age" value={String(candidate.age)} />
                <Stat label="Email" value={candidate.email ?? "—"} />
                <Stat label="Added" value={formatDate(candidate.createdAt)} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeading icon={SendIcon} title="Assignments" description={`${assignments.length} total`} />
          <CardContent>
            {assignments.length === 0 ? (
              <EmptyState
                icon={SendIcon}
                title="No assignments yet"
                description="This candidate hasn't been assigned a placement test."
              />
            ) : (
              <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-0.5">
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
                      title={assignment.test.title}
                      subtitle={`Created ${formatDate(assignment.createdAt)}`}
                      meta={
                        result && (
                          <span className="font-medium text-foreground">
                            {result.rawScore}/{result.totalQuestions} ({formatPercentage(result.percentage)})
                            {result.level ? ` · ${result.level}` : ""}
                          </span>
                        )
                      }
                      status={<AssignmentStatusBadge status={displayStatus} />}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words text-foreground">{value}</dd>
    </div>
  );
}
