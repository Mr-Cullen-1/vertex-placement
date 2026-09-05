import Link from "next/link";
import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getCandidate } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { CandidateNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { IdCardIcon, SendIcon } from "lucide-react";
import { displayStatusForAssignment } from "@/domain/placement/assignment-status";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileRecordCard } from "@/components/admin/mobile-record-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowChevronCell,
} from "@/components/ui/table";
import { candidateDisplayName, formatDate } from "@/lib/format";

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">
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

      <Card>
        <CardHeading icon={IdCardIcon} title="Candidate information" />
        <CardContent>
          {isPending ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Awaiting student details — this candidate hasn&apos;t opened their invitation and
              entered their information yet.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <>
              <div className="hidden sm:block">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Test</TableHead>
                      <TableHead className="w-[25%]">Status</TableHead>
                      <TableHead className="w-[17%]">Created</TableHead>
                      <TableHead aria-hidden="true" className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="whitespace-normal">
                          <Link
                            href={`/admin/assignments/${assignment.id}`}
                            className="block truncate font-medium text-foreground hover:underline"
                          >
                            {assignment.test.title}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                          {formatDate(assignment.createdAt)}
                        </TableCell>
                        <TableRowChevronCell />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="flex flex-col gap-2 sm:hidden">
                {assignments.map((assignment) => (
                  <li key={assignment.id}>
                    <MobileRecordCard
                      href={`/admin/assignments/${assignment.id}`}
                      title={assignment.test.title}
                      subtitle={formatDate(assignment.createdAt)}
                      meta={<AssignmentStatusBadge status={displayStatusForAssignment(assignment)} />}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
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
