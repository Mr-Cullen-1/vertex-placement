import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getPlacementTest } from "@/server/services/placement-test.service";
import { listQuestionsForTest } from "@/server/services/question.service";
import { listPlacementBands } from "@/server/services/placement-band.service";
import { listAssignments } from "@/server/services/assignment.service";
import { TestNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TestStatusBadge, AssignmentStatusBadge } from "@/components/admin/status-badge";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { TestLifecycleActions } from "@/components/admin/tests/test-lifecycle-actions";
import { PublicSelfServiceToggle } from "@/components/admin/tests/public-self-service-toggle";
import { InteractiveListItem } from "@/components/admin/interactive-list-item";
import { BandsManager } from "@/components/admin/bands/bands-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileTextIcon, LayersIcon, ListChecksIcon, SendIcon } from "lucide-react";
import { candidateDisplayName, formatDate, formatDurationSeconds } from "@/lib/format";

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActorOrThrow();

  let test;
  try {
    test = await getPlacementTest(actor, id);
  } catch (error) {
    if (error instanceof TestNotFoundError) notFound();
    throw error;
  }

  const [questions, bands, allAssignments] = await Promise.all([
    listQuestionsForTest(actor, id),
    listPlacementBands(actor, id),
    listAssignments(actor),
  ]);

  const publishedQuestionCount = questions.filter((q) => q.status === "PUBLISHED").length;
  const testAssignments = allAssignments.filter((a) => a.testId === id);
  const isSuperAdmin = actor.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Test details"
        title={test.title}
        backHref="/admin/tests"
        backLabel="Tests"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/admin/tests/${id}/questions`} />}
            >
              <ListChecksIcon />
              Questions
            </Button>
            {isSuperAdmin && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <TestLifecycleActions test={test} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeading icon={FileTextIcon} title="Test information" />
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Status">
                  <TestStatusBadge status={test.status} />
                </Stat>
                <Stat label="Duration" value={formatDurationSeconds(test.durationSeconds)} />
                <Stat label="Questions" value={`${publishedQuestionCount} / ${test.totalQuestionCount}`} />
                <Stat label="Created" value={formatDate(test.createdAt)} />
              </dl>
              {test.description && (
                <p className="text-sm text-muted-foreground">{test.description}</p>
              )}
              {test.sourceAttribution && (
                <p className="text-xs text-muted-foreground">Source: {test.sourceAttribution}</p>
              )}
              {isSuperAdmin && (
                <PublicSelfServiceToggle
                  testId={test.id}
                  status={test.status}
                  isPublic={test.isPublicSelfService}
                />
              )}
              {test.status === "DRAFT" && publishedQuestionCount === 0 && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                  This test has no published questions yet, so it can&apos;t be published. Add
                  and publish at least one question first.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeading icon={SendIcon} title="Assignments" description={`${testAssignments.length} for this test`} />
            <CardContent>
              {testAssignments.length === 0 ? (
                <EmptyState
                  icon={SendIcon}
                  title="No assignments for this test yet"
                  description="Create an assignment to send this test to a candidate."
                />
              ) : (
                <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-0.5">
                  {testAssignments.map((assignment) => (
                    <InteractiveListItem
                      key={assignment.id}
                      href={`/admin/assignments/${assignment.id}`}
                      actionLabel="View assignment"
                      title={candidateDisplayName(assignment.candidate)}
                      subtitle={`Created ${formatDate(assignment.createdAt)}`}
                      status={<AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card variant="tinted" className="h-fit">
          <CardHeading icon={LayersIcon} title="Placement bands" description="Scoring configuration" />
          <CardContent>
            {isSuperAdmin ? (
              <BandsManager testId={id} bands={bands} locked={test.status === "ARCHIVED"} />
            ) : bands.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scoring bands configured — results will show a raw score without a level
                label.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {bands.map((band) => (
                  <li key={band.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{band.label}</span>
                    <span className="text-muted-foreground">
                      {band.minPercentage}–{band.maxPercentage}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words text-foreground">{children ?? value}</dd>
    </div>
  );
}
