import { Button } from "@/components/ui/button";
import { VertexWordmark } from "./vertex-mark";

interface PlacementInstructionsProps {
  totalQuestions: number;
  durationMinutes: number;
  starting: boolean;
  error: string | null;
  onBegin: () => void;
}

const RULES = [
  "Questions become progressively more difficult as you go.",
  "Answer as many questions as you can.",
  "You may skip a question and come back to it later.",
  "You can change an answer any time before you submit.",
  "The test ends automatically when time runs out.",
];

/** Deliberately says nothing about placement bands, scoring thresholds,
 * or the answer key — see /docs/PRODUCT_RULES.md. */
export function PlacementInstructions({
  totalQuestions,
  durationMinutes,
  starting,
  error,
  onBegin,
}: PlacementInstructionsProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Before you begin
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalQuestions} questions · {durationMinutes} minutes maximum
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-3 text-sm text-foreground">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button size="lg" className="h-11 text-base" onClick={onBegin} disabled={starting}>
          {starting ? "Starting…" : "Start test"}
        </Button>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
