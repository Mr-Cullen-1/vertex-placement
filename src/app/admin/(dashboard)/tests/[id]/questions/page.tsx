import { notFound } from "next/navigation";
import { getActorOrThrow } from "@/lib/actor";
import { getPlacementTest } from "@/server/services/placement-test.service";
import { listQuestionsForTest } from "@/server/services/question.service";
import { TestNotFoundError } from "@/server/errors";
import { ListChecksIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { QuestionFormDialog } from "@/components/admin/questions/question-form-dialog";
import { QuestionList } from "@/components/admin/questions/question-list";

export default async function TestQuestionsPage({
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

  const questions = await listQuestionsForTest(actor, id);
  const isSuperAdmin = actor.role === "SUPER_ADMIN";
  const editable = isSuperAdmin && test.status === "DRAFT";

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-4xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Question authoring"
        title={`Questions — ${test.title}`}
        description="Fixed progressive order — never randomized or adaptive. Only answer-option display order is randomized per attempt."
        backHref={`/admin/tests/${id}`}
        backLabel={test.title}
        action={editable ? <QuestionFormDialog testId={id} nextOrder={questions.length + 1} /> : undefined}
      />

      {!editable && isSuperAdmin && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          This test is {test.status.toLowerCase()}, so its questions are read-only. Only a DRAFT
          test&apos;s questions can be authored.
        </p>
      )}

      {questions.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title="No questions yet"
          description={
            editable
              ? "Add the first question to start building this test."
              : "No questions have been added to this test yet."
          }
          action={editable ? <QuestionFormDialog testId={id} nextOrder={1} /> : undefined}
        />
      ) : (
        <QuestionList testId={id} questions={questions} editable={editable} />
      )}
    </div>
  );
}
