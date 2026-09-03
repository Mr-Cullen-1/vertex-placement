import type { StudentResultSummary } from "@/domain/results/types";
import { VertexWordmark } from "./vertex-mark";

/**
 * Professional assessment result — not a game reward screen. No
 * confetti, no correct-answer review, no scoring-configuration detail
 * (see /docs/PRODUCT_RULES.md "Results"). Renders exactly what the
 * server returned; never recomputes or infers anything about the score.
 */
export function PlacementResult({ result }: { result: StudentResultSummary }) {
  const minutes = Math.floor(result.completionSeconds / 60);
  const seconds = result.completionSeconds % 60;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Assessment complete</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {result.candidateName}
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-8 py-10 text-center">
          {result.level && (
            <span className="rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
              {result.level}
            </span>
          )}
          <div className="mt-2 text-5xl font-semibold tracking-tight text-foreground">
            {result.rawScore}
            <span className="text-2xl font-normal text-muted-foreground">
              {" "}
              / {result.totalQuestions}
            </span>
          </div>
          <p className="text-base text-muted-foreground">
            {Math.round(result.percentage)}% correct
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Completion time</dt>
            <dd className="font-medium text-foreground">
              {minutes}m {seconds}s
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Questions</dt>
            <dd className="font-medium text-foreground">{result.totalQuestions}</dd>
          </div>
        </dl>

        {result.strongestTopics.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-foreground">Your strongest areas</h2>
            <div className="flex flex-col gap-2">
              {result.strongestTopics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{topic.topic}</span>
                  <span className="font-medium text-foreground">
                    {Math.round(topic.percentage)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">{result.summary}</p>

        <p className="text-center text-xs text-muted-foreground">
          Your result has been recorded. The center that invited you will follow up with next
          steps.
        </p>
      </div>
    </div>
  );
}
