"use client";

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
  onSelect: (optionId: string) => void;
}

export function PlacementQuestion({
  question,
  totalQuestions,
  disabled,
  onSelect,
}: PlacementQuestionProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">
          Question {question.order} of {totalQuestions}
        </span>
        <h1 className="text-xl font-semibold leading-snug text-foreground sm:text-2xl">
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
