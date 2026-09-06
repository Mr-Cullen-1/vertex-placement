import { ClipboardListIcon, GlobeIcon } from "lucide-react";
import { getActorOrThrow } from "@/lib/actor";
import { listPlacementTests } from "@/server/services/placement-test.service";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { TestStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { InteractiveListItem, ListPanel } from "@/components/admin/interactive-list-item";
import { CreateTestDialog } from "@/components/admin/tests/create-test-dialog";
import { ImportTestDialog } from "@/components/admin/tests/import-test-dialog";
import { formatDate, formatDurationSeconds } from "@/lib/format";

export default async function TestsPage() {
  const actor = await getActorOrThrow();
  const tests = await listPlacementTests(actor);
  const isSuperAdmin = actor.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-6 p-4 md:p-8">
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
        <ListPanel>
          {tests.map((test) => (
            <InteractiveListItem
              key={test.id}
              href={`/admin/tests/${test.id}`}
              actionLabel="Open test"
              title={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {test.title}
                  {test.isPublicSelfService && (
                    <Badge variant="info" className="shrink-0">
                      <GlobeIcon />
                      Try Yourself
                    </Badge>
                  )}
                </span>
              }
              meta={
                <>
                  <span>{formatDurationSeconds(test.durationSeconds)}</span>
                  <span>{test.totalQuestionCount} questions</span>
                  <span>Created {formatDate(test.createdAt)}</span>
                </>
              }
              status={<TestStatusBadge status={test.status} />}
            />
          ))}
        </ListPanel>
      )}
    </div>
  );
}
