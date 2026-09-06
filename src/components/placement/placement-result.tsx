import type { StudentResultSummary } from "@/domain/results/types";
import { VertexWordmark } from "./vertex-mark";
import { DetailedAnalysis } from "./detailed-analysis";
import { LevelScale } from "./level-scale";
import { ScoreRing } from "@/components/shared/score-ring";

/**
 * Professional assessment result — not a game reward screen. No
 * confetti, no correct-answer review, no scoring-configuration detail
 * (see /docs/PRODUCT_RULES.md "Results"). Renders exactly what the
 * server returned; never recomputes or infers anything about the score.
 *
 * "Recommended Level" (`result.level`) is the only placement signal shown
 * here — it is the admin-configured `PlacementBand` match against the
 * candidate's TOTAL correct score (raw score or percentage, per that
 * band's own scoring mode — see /docs/PHASE_2L_SCORING_POLICY.md), never
 * influenced by which specific question was answered correctly.
 * Deliberately labeled "Recommended" (Phase 2L), not an unqualified
 * "Level" — this is an automated recommendation, not an immutable
 * academic placement decision; that decision (Final Placement) is an
 * admin-only concept and never rendered on this student-facing screen.
 * `result.progression` (question-order-derived "highest correctly-
 * answered question") previously also rendered here as "Recommended
 * progression" — removed (P0 fix) after it produced results like "4/70
 * correct" showing "Advanced" purely because a single late, harder
 * question happened to be answered correctly. That signal is real and
 * still computed (its objective answered/correct/incorrect/unanswered
 * counts are still shown below), but the question-position-derived band
 * label is now admin-only diagnostic — see the Result Detail page
 * ("Question progression evidence") and /docs/PRODUCT_RULES.md "Scoring
 * & placement". Never reintroduce a placement-band-like label here
 * derived from anything other than `result.level`.
 *
 * Phase 2L also adds the collapsed-by-default "Detailed analysis"
 * section (`DetailedAnalysis`, ./detailed-analysis.tsx) — course-level
 * performance, an evidence-aware strength/weakness summary, and a
 * question-by-question review. All diagnostic, never determines
 * `result.level`.
 *
 * Phase 2J: reached by both an admin-invited candidate AND a public
 * "Try Yourself" visitor (/docs/PHASE_2J_TRY_YOURSELF.md "Shared Test
 * Runner") — the two closing lines were reworded to stop assuming "the
 * center that invited you" exists. The only change this feature made to
 * this file; no layout/logic change, no "if public" branch.
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

        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          {result.level && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-overline text-primary">Recommended level</span>
              <span className="text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
                {result.level}
              </span>
            </div>
          )}
          <ScoreRing percentage={result.percentage} size={128} strokeWidth={8}>
            <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums text-foreground">
              {Math.round(result.percentage)}%
            </span>
            <span className="text-caption">
              {result.rawScore} / {result.totalQuestions}
            </span>
          </ScoreRing>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-5 py-4">
          <LevelScale level={result.level} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This result reflects your total correct answers on this assessment.
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

        <DetailedAnalysis analysis={result.detailedAnalysis} />

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

        <p className="text-center text-xs text-muted-foreground">Your result has been recorded.</p>
      </div>
    </div>
  );
}
