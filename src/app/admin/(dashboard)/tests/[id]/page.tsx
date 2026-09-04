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
import { TestLifecycleActions } from "@/components/admin/tests/test-lifecycle-actions";
import { BandsManager } from "@/components/admin/bands/bands-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecksIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDurationSeconds } from "@/lib/format";

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
            {isSuperAdmin && <TestLifecycleActions test={test} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Test information</CardTitle>
            </CardHeader>
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
              {test.status === "DRAFT" && publishedQuestionCount === 0 && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  This test has no published questions yet, so it can&apos;t be published. Add
                  and publish at least one question first.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {testAssignments.length === 0 ? (
                <EmptyState
                  title="No assignments for this test yet"
                  description="Create an assignment to send this test to a candidate."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <Link
                            href={`/admin/assignments/${assignment.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {assignment.candidate.firstName} {assignment.candidate.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusBadge status={assignment.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(assignment.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Placement bands</CardTitle>
          </CardHeader>
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
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children ?? value}</dd>
    </div>
  );
}
