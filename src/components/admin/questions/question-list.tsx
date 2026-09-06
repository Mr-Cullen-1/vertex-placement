"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, RocketIcon, Trash2Icon } from "lucide-react";
import { deleteQuestionAction, publishQuestionAction, reorderQuestionsAction } from "@/server/actions/question-actions";
import { QuestionFormDialog } from "@/components/admin/questions/question-form-dialog";
import { QuestionStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
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
 * test-state server-side regardless of what the UI shows.
 *
 * Redesign pass: each row is collapsed by default (order, status, a
 * truncated one-line preview) and expands inline to show the full prompt
 * and options — a real 70-question test previously rendered every prompt
 * and every option fully expanded at once, which is unmanageable as a
 * workspace. See /docs/DESIGN_SYSTEM.md "Questions authoring". */
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {error && (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {questions.map((question, index) => {
          const correctOption = question.options.find((o) => o.isCorrect);
          return (
            <QuestionRowItem
              key={question.id}
              question={question}
              correctOption={correctOption}
              editable={editable}
              pending={pendingId !== null}
              canMoveUp={index > 0}
              canMoveDown={index < questions.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onPublish={() => handlePublish(question.id)}
              testId={testId}
            />
          );
        })}
      </ul>
    </div>
  );
}

function QuestionRowItem({
  question,
  correctOption,
  editable,
  pending,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onPublish,
  testId,
}: {
  question: QuestionRow;
  correctOption: QuestionRow["options"][number] | undefined;
  editable: boolean;
  pending: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPublish: () => void;
  testId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 p-3">
        {editable && (
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={!canMoveUp || pending} onClick={onMoveUp}>
              <ArrowUpIcon />
            </Button>
            <span className="w-6 text-center text-xs font-medium text-muted-foreground">{question.order}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={!canMoveDown || pending} onClick={onMoveDown}>
              <ArrowDownIcon />
            </Button>
          </div>
        )}
        {!editable && (
          <span className="flex size-6 shrink-0 items-center justify-center pt-0.5 text-xs font-medium text-muted-foreground">
            {question.order}
          </span>
        )}

        <CollapsibleTrigger className="min-w-0 flex-1 py-0.5">
          <div className="flex min-w-0 flex-col gap-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <QuestionStatusBadge status={question.status} />
              {question.metadata?.difficultyBand && (
                <span className="text-xs text-muted-foreground">{question.metadata.difficultyBand}</span>
              )}
              {!correctOption && <span className="text-xs text-destructive">No correct option set</span>}
            </div>
            <p className="truncate text-sm text-foreground">{question.prompt}</p>
          </div>
          <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>

        {editable && (
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <QuestionFormDialog testId={testId} question={question} />
            {question.status === "DRAFT" && (
              <Button variant="outline" size="icon-sm" aria-label="Publish question" disabled={pending} onClick={onPublish}>
                <RocketIcon />
              </Button>
            )}
            <DeleteQuestionDialog questionId={question.id} />
          </div>
        )}
      </div>

      <CollapsiblePanel>
        <div className="flex flex-col gap-2 border-t border-border px-3 py-3 pl-12">
          <p className="text-sm text-foreground">{question.prompt}</p>
          <ul className="flex flex-col gap-0.5">
            {question.options.map((option) => (
              <li key={option.id} className={option.isCorrect ? "text-xs font-medium text-success" : "text-xs text-muted-foreground"}>
                {option.isCorrect ? "✓ " : "— "}
                {option.text}
              </li>
            ))}
          </ul>
        </div>
      </CollapsiblePanel>
    </Collapsible>
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
