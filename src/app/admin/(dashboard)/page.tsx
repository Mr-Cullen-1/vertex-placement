import Link from "next/link";
import {
  ActivityIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  SendIcon,
  UsersIcon,
} from "lucide-react";
import { getActorOrThrow } from "@/lib/actor";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { MetricCard } from "@/components/admin/metric-card";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { formatDate } from "@/lib/format";

/** Operational overview — every number here is a live count from the
 * database, never mock analytics (see /docs/PHASE_2B.md "Dashboard" and
 * the Phase 2B brief's explicit "do not invent fake analytics" rule). */
export default async function AdminDashboardPage() {
  const actor = await getActorOrThrow();
  const [tests, candidates, assignments] = await Promise.all([
    listPlacementTests(actor),
    listCandidates(actor),
    listAssignments(actor),
  ]);

  const activeAssignments = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
  ).length;
  const completedAttempts = assignments.filter((a) => a.status === "COMPLETED").length;
  const availableTests = tests.filter((t) => t.status === "PUBLISHED").length;
  const assignedCandidateCount = new Set(assignments.map((a) => a.candidateId)).size;
  const recentAssignments = assignments.slice(0, 6);

  const isEmpty = candidates.length === 0 && assignments.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A live operational snapshot of Vertex Placement — every number here reflects real data."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Candidates"
          value={candidates.length}
          icon={UsersIcon}
          tone="primary"
          hint={candidates.length > 0 ? `${assignedCandidateCount} assigned a test` : undefined}
        />
        <MetricCard
          label="Active assignments"
          value={activeAssignments}
          icon={SendIcon}
          tone="warning"
          hint={assignments.length > 0 ? `of ${assignments.length} total` : undefined}
        />
        <MetricCard
          label="Completed attempts"
          value={completedAttempts}
          icon={ClipboardCheckIcon}
          tone="success"
          hint={assignments.length > 0 ? `of ${assignments.length} total` : undefined}
        />
        <MetricCard
          label="Available tests"
          value={availableTests}
          icon={ClipboardListIcon}
          tone="info"
          hint={tests.length > 0 ? `of ${tests.length} total` : undefined}
        />
      </div>

      <Card>
        <CardHeading icon={ActivityIcon} title="Recent activity" description="The latest assignments across the system." />
        <CardContent>
          {isEmpty ? (
            <EmptyState
              icon={UsersIcon}
              title="Nothing here yet"
              description="Create a candidate and an assignment to get started with Vertex Placement."
              action={
                <Button size="sm" nativeButton={false} render={<Link href="/admin/candidates" />}>
                  Add a candidate
                </Button>
              }
            />
          ) : recentAssignments.length === 0 ? (
            <EmptyState
              icon={SendIcon}
              title="No assignments yet"
              description="Candidates exist, but no test has been assigned to anyone yet."
              action={
                <Button size="sm" nativeButton={false} render={<Link href="/admin/assignments" />}>
                  Create an assignment
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href={`/admin/assignments/${assignment.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg py-2.5 pr-1 pl-2 -mx-2 transition-colors first:pt-2.5 last:pb-2.5 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {assignment.candidate.firstName} {assignment.candidate.lastName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {assignment.test.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {formatDate(assignment.createdAt)}
                      </span>
                      <AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />
                      <ChevronRightIcon className="size-4 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
