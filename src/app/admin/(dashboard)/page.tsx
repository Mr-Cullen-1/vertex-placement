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
import { getRecommendedLevelDistribution } from "@/server/services/attempt.service";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { MetricCard } from "@/components/admin/metric-card";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { STANDARD_PLACEMENT_LEVELS } from "@/domain/placement/levels";
import { candidateDisplayName, formatDate } from "@/lib/format";

/** Operational overview — every number here is a live count from the
 * database, never mock analytics (see /docs/PHASE_2B.md "Dashboard" and
 * the Phase 2B brief's explicit "do not invent fake analytics" rule).
 *
 * Redesign pass: replaced the "4 identical KPI cards + one big list"
 * pattern with varied metric weight plus a real two-panel analytical row
 * — a Recommended Level distribution (an honest tally of already-computed
 * `placementBandId` values, see `getRecommendedLevelDistribution`) beside
 * Recent Activity, which now scrolls in its own fixed-height panel rather
 * than growing the whole page. See /docs/DESIGN_SYSTEM.md "Dashboard". */
export default async function AdminDashboardPage() {
  const actor = await getActorOrThrow();
  const [tests, candidates, assignments, levelDistribution] = await Promise.all([
    listPlacementTests(actor),
    listCandidates(actor),
    listAssignments(actor),
    getRecommendedLevelDistribution(actor),
  ]);

  const activeAssignments = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
  ).length;
  const completedAttempts = assignments.filter((a) => a.status === "COMPLETED").length;
  const availableTests = tests.filter((t) => t.status === "PUBLISHED").length;
  const assignedCandidateCount = new Set(assignments.map((a) => a.candidateId)).size;
  const recentAssignments = assignments.slice(0, 14);

  const isEmpty = candidates.length === 0 && assignments.length === 0;

  // Always show all six standard levels, even at zero — never hide a
  // category just because no candidate has reached it yet.
  const countByLabel = new Map(levelDistribution.map((entry) => [entry.label, entry.count]));
  const fullDistribution = STANDARD_PLACEMENT_LEVELS.map((label) => ({
    label,
    count: countByLabel.get(label) ?? 0,
  }));
  const maxLevelCount = Math.max(1, ...fullDistribution.map((entry) => entry.count));
  const totalPlacedResults = fullDistribution.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-6 overflow-hidden p-4 md:p-8">
      <div className="animate-page-in shrink-0">
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="A live operational snapshot of Vertex Placement — every number here reflects real data."
        />
      </div>

      <div
        className="grid shrink-0 grid-cols-2 gap-3 animate-page-in lg:grid-cols-4"
        style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
      >
        <MetricCard
          label="Candidates"
          value={candidates.length}
          icon={UsersIcon}
          tone="primary"
          hint={candidates.length > 0 ? `${assignedCandidateCount} assigned a test` : undefined}
          href="/admin/candidates"
        />
        <MetricCard
          label="Active assignments"
          value={activeAssignments}
          icon={SendIcon}
          tone="warning"
          hint={assignments.length > 0 ? `of ${assignments.length} total` : undefined}
          href="/admin/assignments"
        />
        <MetricCard
          label="Completed attempts"
          value={completedAttempts}
          icon={ClipboardCheckIcon}
          tone="success"
          hint={assignments.length > 0 ? `of ${assignments.length} total` : undefined}
          href="/admin/assignments"
        />
        <MetricCard
          label="Available tests"
          value={availableTests}
          icon={ClipboardListIcon}
          tone="info"
          hint={tests.length > 0 ? `of ${tests.length} total` : undefined}
          href="/admin/tests"
        />
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-6 animate-page-in xl:grid-cols-[1.8fr_1fr]"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <Card className="flex h-full min-h-0 flex-col">
          <CardHeading
            className="shrink-0"
            title="Recent activity"
            description="The latest assignments across the system."
          />
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
            {isEmpty ? (
              <EmptyState
                icon={UsersIcon}
                title="Nothing here yet"
                description="Create a candidate and an assignment to get started."
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
              <ul className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-border overflow-x-hidden overflow-y-auto">
                {recentAssignments.map((assignment) => (
                  <li key={assignment.id} className="min-w-0 shrink-0">
                    <Link
                      href={`/admin/assignments/${assignment.id}`}
                      className="group flex min-w-0 items-center justify-between gap-3 rounded-lg py-3 pr-1 pl-2 -mx-2 transition-colors first:pt-1 last:pb-1 hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={
                            assignment.candidate.profileCompletedAt
                              ? "truncate text-sm font-medium text-foreground"
                              : "truncate text-sm font-medium text-muted-foreground italic"
                          }
                        >
                          {candidateDisplayName(assignment.candidate)}
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

        <Card className="h-full overflow-hidden">
          <CardHeading
            className="shrink-0"
            icon={ActivityIcon}
            title="Recommended Level distribution"
            description={
              totalPlacedResults > 0
                ? `${totalPlacedResults} completed result${totalPlacedResults === 1 ? "" : "s"}`
                : "No completed results yet"
            }
          />
          <CardContent className="flex flex-col gap-3">
            {fullDistribution.map((entry) => (
              <div key={entry.label} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs font-medium text-foreground">
                  {entry.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full animate-grow-in rounded-full bg-primary transition-[width] duration-500 ease-out"
                    style={{ width: `${(entry.count / maxLevelCount) * 100}%` }}
                  />
                </div>
                <span className="w-4 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {entry.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
