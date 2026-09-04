import type { StudentResultSummary } from "@/domain/results/types";
import { PROGRESSION_BANDS } from "@/domain/placement/progression";
import { ProgressionTrack } from "@/components/shared/progression-track";
import { VertexWordmark } from "./vertex-mark";

/**
 * Professional assessment result — not a game reward screen. No
 * confetti, no correct-answer review, no scoring-configuration detail
 * (see /docs/PRODUCT_RULES.md "Results"). Renders exactly what the
 * server returned; never recomputes or infers anything about the score.
 *
 * Placement guidance (`result.progression`) is presented as guidance,
 * never certification — see /docs/PHASE_2E.md "Critical terminology".
 * It is a SEPARATE concept from `result.level` (the existing, optional,
 * admin-configured percentage-based PlacementBand, still shown above if
 * set) — the two may both be present, absent, or disagree, and that's
 * fine: one is an admin-defined score band, the other is descriptive
 * question-progression guidance derived straight from the source.
 */
export function PlacementResult({ result }: { result: StudentResultSummary }) {
  const minutes = Math.floor(result.completionSeconds / 60);
  const seconds = result.completionSeconds % 60;
  const { progression } = result;

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-md animate-page-in flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Assessment complete</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {result.candidateName}
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          {result.level && (
            <span className="rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
              {result.level}
            </span>
          )}
          <div className="mt-2 text-5xl font-semibold tracking-tight text-foreground tabular-nums">
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

        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-accent/30 px-5 py-5 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Recommended progression
            </p>
            <p className="text-xl font-semibold text-foreground">
              {progression.progressionBand ? progression.progressionBand.label : "Below Beginner"}
            </p>
          </div>
          <ProgressionTrack
            bands={PROGRESSION_BANDS}
            currentOrder={progression.progressionBand?.order ?? null}
            compact
          />
          <p className="text-sm text-muted-foreground">
            {progression.progressionBand
              ? `Your result indicates that the ${progression.progressionBand.label} progression may be a suitable starting point.`
              : "We recommend a teacher review to confirm a suitable starting point."}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Placement is based on your performance across questions of increasing difficulty. Your
          teacher or education center can use this result to confirm your starting level.
        </p>

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

        <dl className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Correct</dt>
            <dd className="font-medium text-foreground">{progression.correctCount}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Incorrect</dt>
            <dd className="font-medium text-foreground">{progression.incorrectCount}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-3 py-3">
            <dt className="text-xs text-muted-foreground">Unanswered</dt>
            <dd className="font-medium text-foreground">{progression.unansweredCount}</dd>
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

        {result.autoSubmitted && (
          <p className="text-center text-xs text-muted-foreground">
            Your test was submitted automatically when the time limit was reached.
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Your result has been recorded. The center that invited you will follow up with next
          steps.
        </p>
      </div>
    </div>
  );
}
