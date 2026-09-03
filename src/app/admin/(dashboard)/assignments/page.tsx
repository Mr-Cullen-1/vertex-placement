import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listAssignments } from "@/server/services/assignment.service";
import { listCandidates } from "@/server/services/candidate.service";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { NewAssignmentDialog } from "@/components/admin/assignments/new-assignment-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string }>;
}) {
  const { candidateId } = await searchParams;
  const actor = await getActorOrThrow();
  const [assignments, candidates, tests] = await Promise.all([
    listAssignments(actor),
    listCandidates(actor),
    listPlacementTests(actor),
  ]);

  const candidateOptions = candidates.map((c) => ({
    id: c.id,
    label: `${c.firstName} ${c.lastName} — ${c.phoneNumber}`,
  }));
  const publishedTests = tests
    .filter((t) => t.status === "PUBLISHED")
    .map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Assignments"
        description="Candidate + test pairings, and the invitations issued for them."
        action={
          <NewAssignmentDialog
            candidates={candidateOptions}
            publishedTests={publishedTests}
            initialCandidateId={candidateId}
            autoOpen={Boolean(candidateId)}
          />
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Create an assignment to send a candidate their invitation link."
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
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
                      {assignment.candidate.firstName} {assignment.candidate.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{assignment.test.title}</TableCell>
                  <TableCell>
                    <AssignmentStatusBadge status={assignment.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(assignment.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
