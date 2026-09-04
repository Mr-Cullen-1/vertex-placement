import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
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
  const recentAssignments = assignments.slice(0, 6);

  const isEmpty = candidates.length === 0 && assignments.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Dashboard"
        description="Operational overview of Vertex Placement."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Candidates" value={candidates.length} />
        <StatTile label="Active assignments" value={activeAssignments} />
        <StatTile label="Completed attempts" value={completedAttempts} />
        <StatTile label="Available tests" value={availableTests} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <EmptyState
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
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}
