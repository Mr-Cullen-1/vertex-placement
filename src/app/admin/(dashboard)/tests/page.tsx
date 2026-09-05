import Link from "next/link";
import { ClipboardListIcon, GlobeIcon } from "lucide-react";
import { getActorOrThrow } from "@/lib/actor";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TestStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { MobileRecordCard } from "@/components/admin/mobile-record-card";
import { CreateTestDialog } from "@/components/admin/tests/create-test-dialog";
import { ImportTestDialog } from "@/components/admin/tests/import-test-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowChevronCell,
} from "@/components/ui/table";
import { formatDate, formatDurationSeconds } from "@/lib/format";

export default async function TestsPage() {
  const actor = await getActorOrThrow();
  const tests = await listPlacementTests(actor);
  const isSuperAdmin = actor.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Authoring"
        title="Placement tests"
        description="Test definitions available for assignment."
        action={
          isSuperAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <ImportTestDialog />
              <CreateTestDialog />
            </div>
          ) : undefined
        }
      />

      {tests.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No placement tests yet"
          description={
            isSuperAdmin
              ? "Create a test to start assigning it to candidates, or import a test."
              : "No placement test has been created yet. A Super Admin needs to create one."
          }
          action={
            isSuperAdmin ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ImportTestDialog />
                <CreateTestDialog />
              </div>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[38%]">Title</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="w-[15%]">Duration</TableHead>
                  <TableHead className="w-[14%]">Questions</TableHead>
                  <TableHead className="w-[13%]">Created</TableHead>
                  <TableHead aria-hidden="true" className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/admin/tests/${test.id}`}
                          className="truncate font-medium text-foreground hover:underline"
                        >
                          {test.title}
                        </Link>
                        {test.isPublicSelfService && (
                          <Badge variant="info" className="shrink-0">
                            <GlobeIcon />
                            Try Yourself
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <TestStatusBadge status={test.status} />
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {formatDurationSeconds(test.durationSeconds)}
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">{test.totalQuestionCount}</TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">{formatDate(test.createdAt)}</TableCell>
                    <TableRowChevronCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {tests.map((test) => (
              <li key={test.id}>
                <MobileRecordCard
                  href={`/admin/tests/${test.id}`}
                  title={test.title}
                  subtitle={`${formatDurationSeconds(test.durationSeconds)} · ${test.totalQuestionCount} questions · ${formatDate(test.createdAt)}`}
                  trailing={<TestStatusBadge status={test.status} />}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
