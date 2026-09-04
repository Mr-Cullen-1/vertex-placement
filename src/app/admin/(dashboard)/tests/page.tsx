import Link from "next/link";
import { getActorOrThrow } from "@/lib/actor";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TestStatusBadge } from "@/components/admin/status-badge";
import { CreateTestDialog } from "@/components/admin/tests/create-test-dialog";
import { ImportLanguageHubDialog } from "@/components/admin/tests/import-language-hub-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDurationSeconds } from "@/lib/format";

export default async function TestsPage() {
  const actor = await getActorOrThrow();
  const tests = await listPlacementTests(actor);
  const isSuperAdmin = actor.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Placement tests"
        description="Test definitions available for assignment."
        action={
          isSuperAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <ImportLanguageHubDialog />
              <CreateTestDialog />
            </div>
          ) : undefined
        }
      />

      {tests.length === 0 ? (
        <EmptyState
          title="No placement tests yet"
          description={
            isSuperAdmin
              ? "Create a test to start assigning it to candidates, or import the Language Hub placement test."
              : "No placement test has been created yet. A Super Admin needs to create one."
          }
          action={
            isSuperAdmin ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ImportLanguageHubDialog />
                <CreateTestDialog />
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={`/admin/tests/${test.id}`} className="font-medium text-foreground hover:underline">
                      {test.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <TestStatusBadge status={test.status} />
                  </TableCell>
                  <TableCell>{formatDurationSeconds(test.durationSeconds)}</TableCell>
                  <TableCell>{test.totalQuestionCount}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(test.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
