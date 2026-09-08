import type { StudentResultSummary } from "@/domain/results/types";
import { VertexMark } from "./vertex-mark";
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
 *
 * Manual QA correction pass: rebuilt from a narrow centered column into
 * one wide main result card (near-full viewport width, ~32-56px side
 * margins) with a horizontal hero grid (level/score/scale beside a
 * compact stat row), matching the assessment shell's pastel teal canvas
 * (`bg-assessment-canvas`) so Ready/Instructions/Test/Result feel
 * continuous.
 *
 * Redesign pass: "Your strongest areas" (topic-based, sometimes
 * "Unspecified" when a question has no tagged topic) is gone from this
 * screen — the top stat row carries a plain "Result" percentage instead,
 * reusing the same computed `percentage` shown in the hero ring. Detailed
 * analysis is no longer a collapsed-by-default strip below the main
 * card; it renders as an always-visible card in the right-hand column
 * (`variant="panel"`, see detailed-analysis.tsx) with its own internal
 * scroll, so a long analysis never grows the page itself. At `lg` and up
 * the whole result card is fit to the viewport height so there's no dead
 * strip below the fold; below `lg` the sections stack and the page
 * scrolls normally, same as before.
 *
 * No business/data logic changed: every value below is unchanged from
 * the server response.
 *
 * Phase 2J: reached by both an admin-invited candidate AND a public
 * "Try Yourself" visitor (/docs/PHASE_2J_TRY_YOURSELF.md "Shared Test
 * Runner") — wording stays origin-agnostic.
 */
export function PlacementResult({ result }: { result: StudentResultSummary }) {
  const minutes = Math.floor(result.completionSeconds / 60);
  const seconds = result.completionSeconds % 60;
  const { progression } = result;

  return (
    <div className="flex min-h-dvh flex-col bg-assessment-canvas px-4 py-6 sm:px-8 sm:py-8 lg:h-dvh lg:overflow-hidden lg:py-6">
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 animate-page-in flex-col gap-6 rounded-3xl border border-card-border-hover bg-card p-5 shadow-sm sm:p-8 lg:min-h-0 lg:gap-5 lg:p-8">
        <div className="flex shrink-0 flex-col items-center gap-3 border-b border-border pb-6 text-center sm:flex-row sm:justify-between sm:text-left lg:pb-5">
          <div className="flex items-center gap-3">
            <VertexMark className="size-9" />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Assessment complete</span>
              <span className="text-lg font-semibold tracking-tight text-foreground">{result.candidateName}</span>
            </div>
          </div>
          {result.autoSubmitted && (
            <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning-foreground ring-1 ring-warning/25">
              Submitted automatically at the time limit
            </span>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-8">
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-card-border bg-muted/20 px-6 py-8 text-center lg:py-10">
            {result.level && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-overline text-primary">Recommended level</span>
                <span className="text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
                  {result.level}
                </span>
              </div>
            )}
            <ScoreRing percentage={result.percentage} size={132} strokeWidth={9}>
              <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums text-foreground">
                {Math.round(result.percentage)}%
              </span>
              <span className="text-caption">
                {result.rawScore} / {result.totalQuestions}
              </span>
            </ScoreRing>
            <div className="w-full max-w-xs">
              <LevelScale level={result.level} />
            </div>
            <p className="text-xs text-muted-foreground">
              This result reflects your total correct answers on this assessment.
            </p>
          </div>

          <div className="flex flex-col gap-5 lg:min-h-0">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Completion time" value={`${minutes}m ${seconds}s`} />
              <StatCard label="Questions" value={String(result.totalQuestions)} />
              <StatCard label="Correct" value={String(progression.correctCount)} />
              <StatCard label="Incorrect" value={String(progression.incorrectCount)} />
              <StatCard label="Unanswered" value={String(progression.unansweredCount)} />
              <StatCard label="Result" value={`${Math.round(result.percentage)}%`} />
            </dl>

            <p className="shrink-0 text-sm text-muted-foreground">{result.summary}</p>

            <div className="flex min-h-0 flex-col lg:flex-1">
              <DetailedAnalysis
                analysis={result.detailedAnalysis}
                variant="panel"
                className="max-h-[420px] lg:max-h-none"
              />
            </div>
          </div>
        </div>

        <p className="shrink-0 text-center text-xs text-muted-foreground">Your result has been recorded.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-card-border bg-card px-3 py-3 text-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
