"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, RocketIcon, Trash2Icon } from "lucide-react";
import { deleteQuestionAction, publishQuestionAction, reorderQuestionsAction } from "@/server/actions/question-actions";
import { QuestionFormDialog } from "@/components/admin/questions/question-form-dialog";
import { QuestionStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QuestionRow {
  id: string;
  order: number;
  prompt: string;
  status: "DRAFT" | "PUBLISHED";
  options: { id: string; text: string; isCorrect: boolean }[];
  metadata: { difficultyBand: string | null; topic: string | null; tags: string[]; sourceRef: string | null } | null;
}

/** Question list for a test. `editable` gates whether authoring controls
 * (reorder/edit/publish/delete/add) render at all — the parent page only
 * passes `true` for a Super Admin viewing a DRAFT test, but every action
 * here still calls a Server Action that re-checks permission and
 * test-state server-side regardless of what the UI shows. */
export function QuestionList({
  testId,
  questions,
  editable,
}: {
  testId: string;
  questions: QuestionRow[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setError(null);
    setPendingId(questions[index]!.id);
    const result = await reorderQuestionsAction(
      testId,
      reordered.map((q) => q.id)
    );
    setPendingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function handlePublish(questionId: string) {
    setError(null);
    setPendingId(questionId);
    const result = await publishQuestionAction(questionId);
    setPendingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {questions.map((question, index) => {
          const correctOption = question.options.find((o) => o.isCorrect);
          return (
            <li
              key={question.id}
              className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="flex shrink-0 items-center gap-1 sm:flex-col">
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={index === 0 || pendingId !== null}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                )}
                <span className="w-6 text-center text-xs font-medium text-muted-foreground">
                  {question.order}
                </span>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={index === questions.length - 1 || pendingId !== null}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <QuestionStatusBadge status={question.status} />
                  {question.metadata?.difficultyBand && (
                    <span className="text-xs text-muted-foreground">
                      {question.metadata.difficultyBand}
                    </span>
                  )}
                  {question.metadata?.topic && (
                    <span className="text-xs text-muted-foreground">· {question.metadata.topic}</span>
                  )}
                </div>
                <p className="text-sm text-foreground">{question.prompt}</p>
                <ul className="flex flex-col gap-0.5">
                  {question.options.map((option) => (
                    <li
                      key={option.id}
                      className={
                        option.isCorrect
                          ? "text-xs font-medium text-success"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {option.isCorrect ? "✓ " : "— "}
                      {option.text}
                    </li>
                  ))}
                </ul>
                {!correctOption && (
                  <p className="text-xs text-destructive">No correct option set.</p>
                )}
              </div>

              {editable && (
                <div className="flex shrink-0 items-center gap-2">
                  <QuestionFormDialog testId={testId} question={question} />
                  {question.status === "DRAFT" && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Publish question"
                      disabled={pendingId !== null}
                      onClick={() => handlePublish(question.id)}
                    >
                      <RocketIcon />
                    </Button>
                  )}
                  <DeleteQuestionDialog questionId={question.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeleteQuestionDialog({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    const result = await deleteQuestionAction(questionId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="destructive" size="icon-sm" aria-label="Delete question" />}>
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this question?</DialogTitle>
          <DialogDescription>
            This removes it and its options permanently. Only possible while the test is still a
            draft. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
