import Link from "next/link";
import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getCandidate } from "@/server/services/candidate.service";
import { listAssignments } from "@/server/services/assignment.service";
import { CandidateNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title={`${candidate.firstName} ${candidate.lastName}`}
        backHref="/admin/candidates"
        backLabel="Candidates"
        action={
          <Button size="sm" nativeButton={false} render={<Link href={`/admin/assignments?candidateId=${candidate.id}`} />}>
            New assignment
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Candidate information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Phone" value={candidate.phoneNumber} />
            <Stat label="Age" value={String(candidate.age)} />
            <Stat label="Email" value={candidate.email ?? "—"} />
            <Stat label="Added" value={formatDate(candidate.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              description="This candidate hasn't been assigned a placement test."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link
                        href={`/admin/assignments/${assignment.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {assignment.test.title}
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
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
