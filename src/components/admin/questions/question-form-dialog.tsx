"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { createQuestionAction, updateQuestionAction } from "@/server/actions/question-actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface OptionDraft {
  key: string;
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  metadata: { difficultyBand: string | null; topic: string | null; tags: string[]; sourceRef: string | null } | null;
}

/** DRAFT source-material bands from /docs/PRODUCT_RULES.md, offered as
 * suggestions only — difficultyBand stays a free-form string, never an
 * enum, since the source material doesn't define official cutoffs. */
const DIFFICULTY_BAND_SUGGESTIONS = [
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper Intermediate",
  "Advanced",
];

function newOption(): OptionDraft {
  return { key: Math.random().toString(36).slice(2), text: "", isCorrect: false };
}

/** Create-or-edit dialog for a single Question, its Options, and its
 * QuestionMetadata — Super Admin only. Question.order is never set here:
 * a new question is appended at the end (`nextOrder`), and reordering is
 * a separate, explicit action (see QuestionList's up/down controls) so
 * this form never has to reconcile a manually-typed order against the
 * fixed-sequence invariant. */
export function QuestionFormDialog({
  testId,
  nextOrder,
  question,
}: {
  testId: string;
  nextOrder?: number;
  question?: QuestionDraft;
}) {
  const mode = question ? "edit" : "create";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    question
      ? question.options.map((o) => ({ key: o.id, text: o.text, isCorrect: o.isCorrect }))
      : [newOption(), newOption(), newOption(), newOption()]
  );
  const [difficultyBand, setDifficultyBand] = useState(question?.metadata?.difficultyBand ?? "");
  const [topic, setTopic] = useState(question?.metadata?.topic ?? "");
  const [tags, setTags] = useState((question?.metadata?.tags ?? []).join(", "));
  const [sourceRef, setSourceRef] = useState(question?.metadata?.sourceRef ?? "");

  function resetIfCreate() {
    if (mode === "create") {
      setPrompt("");
      setOptions([newOption(), newOption(), newOption(), newOption()]);
      setDifficultyBand("");
      setTopic("");
      setTags("");
      setSourceRef("");
    }
  }

  function updateOption(key: string, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  function setCorrect(key: string) {
    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));
  }

  function addOption() {
    setOptions((prev) => (prev.length >= 10 ? prev : [...prev, newOption()]));
  }

  function removeOption(key: string) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((o) => o.key !== key)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!options.some((o) => o.isCorrect)) {
      setError("Select exactly one correct option.");
      return;
    }
    if (options.some((o) => o.text.trim() === "")) {
      setError("Every option needs text.");
      return;
    }

    setSubmitting(true);
    const metadataInput = {
      difficultyBand: difficultyBand.trim() === "" ? null : difficultyBand.trim(),
      topic: topic.trim() === "" ? null : topic.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sourceRef: sourceRef.trim() === "" ? null : sourceRef.trim(),
    };
    const optionsInput = options.map((o, index) => ({
      text: o.text.trim(),
      isCorrect: o.isCorrect,
      order: index + 1,
    }));

    const result =
      mode === "create"
        ? await createQuestionAction(testId, {
            order: nextOrder ?? 1,
            prompt: prompt.trim(),
            options: optionsInput,
            metadata: metadataInput,
          })
        : await updateQuestionAction(question!.id, {
            prompt: prompt.trim(),
            options: optionsInput,
            metadata: metadataInput,
          });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    resetIfCreate();
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
      {mode === "create" ? (
        <DialogTrigger render={<Button size="sm" />}>
          <PlusIcon />
          Add question
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label="Edit question" />}>
          <PencilIcon />
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New question" : "Edit question"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? `Added at position ${nextOrder ?? 1}. Reorder afterwards if needed.`
              : "Only possible while the test is still a draft."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`prompt-${mode}`}>Prompt</Label>
            <Textarea
              id={`prompt-${mode}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              maxLength={2000}
              rows={3}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <span className="text-xs text-muted-foreground">Select the correct one</span>
            </div>
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={option.key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${mode}`}
                    aria-label={`Option ${index + 1} is correct`}
                    checked={option.isCorrect}
                    onChange={() => setCorrect(option.key)}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(option.key, { text: e.target.value })}
                    placeholder={`Option ${index + 1}`}
                    maxLength={500}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={options.length <= 2}
                    onClick={() => removeOption(option.key)}
                    aria-label="Remove option"
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={options.length >= 10}
              onClick={addOption}
            >
              <PlusIcon />
              Add option
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Metadata is informational only — it does not make the test adaptive. Question
              order stays fixed regardless of these values.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`band-${mode}`}>Difficulty band</Label>
                <Input
                  id={`band-${mode}`}
                  list={`band-suggestions-${mode}`}
                  value={difficultyBand}
                  onChange={(e) => setDifficultyBand(e.target.value)}
                  maxLength={100}
                />
                <datalist id={`band-suggestions-${mode}`}>
                  {DIFFICULTY_BAND_SUGGESTIONS.map((band) => (
                    <option key={band} value={band} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`topic-${mode}`}>Topic</Label>
                <Input
                  id={`topic-${mode}`}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Grammar"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`tags-${mode}`}>Tags (comma-separated)</Label>
                <Input
                  id={`tags-${mode}`}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. tenses, modals"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`source-${mode}`}>Source reference</Label>
                <Input
                  id={`source-${mode}`}
                  value={sourceRef}
                  onChange={(e) => setSourceRef(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. p. 14"
                />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : mode === "create" ? "Save question" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
