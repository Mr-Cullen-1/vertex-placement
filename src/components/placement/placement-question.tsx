"use client";

import { cn } from "@/lib/utils";
import { AnswerOption } from "./answer-option";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export interface PlacementQuestionData {
  questionId: string;
  order: number;
  prompt: string;
  options: { id: string; text: string }[];
  selectedOptionId: string | null;
}

interface PlacementQuestionProps {
  question: PlacementQuestionData;
  totalQuestions: number;
  disabled?: boolean;
  /** Which way the student just navigated — purely cosmetic (a
   * direction-aware slide), never affects data/order. Defaults to
   * "next" so a fresh mount (e.g. the very first question) still gets a
   * sensible entrance. */
  direction?: "next" | "prev";
  onSelect: (optionId: string) => void;
}

// Content-aware sizing (not just viewport-aware): a short prompt gets
// noticeably larger, exam-style type; a long multi-line prompt steps
// down automatically so it doesn't dominate the available height and
// force scrolling on an otherwise-normal question (see
// /docs/DESIGN_SYSTEM.md "Active-question layout"). Never truncated —
// this only changes size, never hides characters.
const PROMPT_SIZE_CLASS = {
  short: "text-[clamp(1.625rem,1.2rem+1.6vw,2rem)]",
  medium: "text-[clamp(1.375rem,1.05rem+1.2vw,1.75rem)]",
  long: "text-[clamp(1.25rem,1rem+0.9vw,1.5rem)]",
} as const;

function promptSizeTier(prompt: string): keyof typeof PROMPT_SIZE_CLASS {
  if (prompt.length > 220) return "long";
  if (prompt.length > 120) return "medium";
  return "short";
}

export function PlacementQuestion({
  question,
  totalQuestions,
  disabled,
  direction = "next",
  onSelect,
}: PlacementQuestionProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        direction === "next" ? "animate-question-next" : "animate-question-prev"
      )}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Question {question.order} of {totalQuestions}
        </span>
        <h1
          className={cn(
            "leading-snug font-semibold text-foreground text-balance",
            PROMPT_SIZE_CLASS[promptSizeTier(question.prompt)]
          )}
        >
          {question.prompt}
        </h1>
      </div>

      <div role="radiogroup" aria-label="Answer options" className="flex flex-col gap-2.5">
        {question.options.map((option, index) => (
          <AnswerOption
            key={option.id}
            label={OPTION_LABELS[index] ?? String(index + 1)}
            text={option.text}
            selected={question.selectedOptionId === option.id}
            disabled={disabled}
            onSelect={() => onSelect(option.id)}
          />
        ))}
      </div>
    </div>
  );
}
