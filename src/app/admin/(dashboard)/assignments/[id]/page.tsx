import Link from "next/link";
import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getAssignment } from "@/server/services/assignment.service";
import { AssignmentNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge, AttemptStatusBadge, TestStatusBadge } from "@/components/admin/status-badge";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { InvitationPanel, type InvitationSummary } from "@/components/admin/assignments/invitation-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDurationSeconds } from "@/lib/format";

const COMPLETED_ATTEMPT_STATUSES = new Set(["SUBMITTED", "AUTO_SUBMITTED"]);

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActorOrThrow();

  let assignment;
  try {
    assignment = await getAssignment(actor, id);
  } catch (error) {
    if (error instanceof AssignmentNotFoundError) notFound();
    throw error;
  }

  // Only status/timestamps ever cross into a Client Component — never the
  // full Prisma row, which also carries `tokenHash` (see invitation-panel.tsx).
  const invitationHistory: InvitationSummary[] = assignment.invitations.map((i) => ({
    id: i.id,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
    usedAt: i.usedAt?.toISOString() ?? null,
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title={`${assignment.candidate.firstName} ${assignment.candidate.lastName}`}
        description={assignment.test.title}
        backHref="/admin/assignments"
        backLabel="Assignments"
        action={<AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Candidate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href={`/admin/candidates/${assignment.candidate.id}`} className="font-medium text-foreground hover:underline">
              {assignment.candidate.firstName} {assignment.candidate.lastName}
            </Link>
            <span className="text-muted-foreground">{assignment.candidate.phoneNumber}</span>
            <span className="text-muted-foreground">Age {assignment.candidate.age}</span>
            {assignment.candidate.email && (
              <span className="text-muted-foreground">{assignment.candidate.email}</span>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Test</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href={`/admin/tests/${assignment.test.id}`} className="font-medium text-foreground hover:underline">
              {assignment.test.title}
            </Link>
            <span className="text-muted-foreground">{formatDurationSeconds(assignment.test.durationSeconds)}</span>
            <TestStatusBadge status={assignment.test.status} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationPanel
            assignmentId={assignment.id}
            history={invitationHistory}
            assignmentCompleted={assignment.status === "COMPLETED"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {assignment.attempts.length === 0 ? (
            <EmptyState
              title="No attempt started yet"
              description="Nothing happens here until the candidate opens their invitation link."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {assignment.attempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5">
                    <AttemptStatusBadge status={attempt.status} />
                    <span className="text-xs text-muted-foreground">
                      Started {formatDateTime(attempt.startedAt)}
                      {attempt.submittedAt ? ` · Submitted ${formatDateTime(attempt.submittedAt)}` : ""}
                    </span>
                  </div>
                  {COMPLETED_ATTEMPT_STATUSES.has(attempt.status) && (
                    <Link
                      href={`/admin/results/${attempt.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View result
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
