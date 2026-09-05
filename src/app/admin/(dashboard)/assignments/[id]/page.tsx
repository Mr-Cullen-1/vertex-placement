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
import { BarChart3Icon, ClipboardListIcon, GlobeIcon, IdCardIcon, LinkIcon, TrophyIcon } from "lucide-react";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { candidateDisplayName, formatDateTime, formatDurationSeconds } from "@/lib/format";

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
        eyebrow="Assignment"
        title={candidateDisplayName(assignment.candidate)}
        description={assignment.test.title}
        backHref="/admin/assignments"
        backLabel="Assignments"
        action={
          <div className="flex items-center gap-2">
            {assignment.origin === "SELF_SERVICE" && (
              <Badge variant="info">
                <GlobeIcon />
                Self-service
              </Badge>
            )}
            <AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card size="sm">
          <CardHeading icon={IdCardIcon} title="Candidate" />
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link
              href={`/admin/candidates/${assignment.candidate.id}`}
              className={
                assignment.candidate.profileCompletedAt
                  ? "font-medium text-foreground hover:underline"
                  : "font-medium text-muted-foreground italic hover:underline"
              }
            >
              {candidateDisplayName(assignment.candidate)}
            </Link>
            {assignment.candidate.profileCompletedAt && (
              <>
                <span className="text-muted-foreground">{assignment.candidate.phoneNumber}</span>
                <span className="text-muted-foreground">Age {assignment.candidate.age}</span>
                {assignment.candidate.email && (
                  <span className="text-muted-foreground">{assignment.candidate.email}</span>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeading icon={ClipboardListIcon} title="Test" />
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href={`/admin/tests/${assignment.test.id}`} className="font-medium text-foreground hover:underline">
              {assignment.test.title}
            </Link>
            <span className="text-muted-foreground">{formatDurationSeconds(assignment.test.durationSeconds)}</span>
            <TestStatusBadge status={assignment.test.status} />
          </CardContent>
        </Card>
      </div>

      <Card variant="tinted">
        <CardHeading icon={LinkIcon} title="Invitation" description="Access lifecycle for this assignment" />
        <CardContent>
          <InvitationPanel
            assignmentId={assignment.id}
            history={invitationHistory}
            assignmentCompleted={assignment.status === "COMPLETED"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeading icon={BarChart3Icon} title="Attempts" description="Assessment activity for this assignment" />
        <CardContent>
          {assignment.attempts.length === 0 ? (
            <EmptyState
              icon={ClipboardListIcon}
              title="No attempt started yet"
              description="Nothing happens here until the candidate opens their invitation link."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {assignment.attempts.map((attempt) => {
                const completed = COMPLETED_ATTEMPT_STATUSES.has(attempt.status);
                return (
                  <li
                    key={attempt.id}
                    className={
                      completed
                        ? "flex items-center justify-between gap-3 rounded-xl bg-success/5 p-3 ring-1 ring-success/15"
                        : "flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3 ring-1 ring-border/60"
                    }
                  >
                    <div className="flex flex-col gap-1">
                      <AttemptStatusBadge status={attempt.status} />
                      <span className="text-xs text-muted-foreground">
                        Started {formatDateTime(attempt.startedAt)}
                        {attempt.submittedAt ? ` · Submitted ${formatDateTime(attempt.submittedAt)}` : ""}
                      </span>
                    </div>
                    {completed && (
                      <Link
                        href={`/admin/results/${attempt.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        <TrophyIcon className="size-4" />
                        View result
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
