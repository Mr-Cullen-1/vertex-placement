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
        "flex flex-col gap-6",
        direction === "next" ? "animate-question-next" : "animate-question-prev"
      )}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Question {question.order} of {totalQuestions}
        </span>
        <h1 className="text-[clamp(1.5rem,1.1rem+1.5vw,2.125rem)] leading-snug font-semibold text-foreground text-balance">
          {question.prompt}
        </h1>
      </div>

      <div role="radiogroup" aria-label="Answer options" className="flex flex-col gap-3">
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
