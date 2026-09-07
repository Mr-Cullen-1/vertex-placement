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
 * continuous. "Detailed analysis" stays the same collapsed-by-default
 * disclosure, now opening inside this one card rather than as a separate
 * stacked block — see /docs/DESIGN_SYSTEM.md "Student Result redesign".
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
    <div className="min-h-dvh bg-assessment-canvas px-4 py-8 sm:px-8 sm:py-10 lg:py-12">
      <div className="mx-auto flex w-full max-w-[1480px] animate-page-in flex-col gap-6 rounded-3xl border border-card-border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
        <div className="flex flex-col items-center gap-3 border-b border-border pb-6 text-center sm:flex-row sm:justify-between sm:text-left">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-8">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-card-border bg-muted/20 px-6 py-8 text-center">
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

          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Completion time" value={`${minutes}m ${seconds}s`} />
              <StatCard label="Questions" value={String(result.totalQuestions)} />
              <StatCard label="Correct" value={String(progression.correctCount)} />
              <StatCard label="Incorrect" value={String(progression.incorrectCount)} />
              <StatCard label="Unanswered" value={String(progression.unansweredCount)} />
            </dl>

            {result.strongestTopics.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl border border-card-border bg-card px-4 py-3.5">
                <h2 className="text-xs font-medium text-muted-foreground">Your strongest areas</h2>
                <div className="flex flex-col gap-1.5">
                  {result.strongestTopics.map((topic) => (
                    <div key={topic.topic} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{topic.topic}</span>
                      <span className="font-medium text-foreground">{Math.round(topic.percentage)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">{result.summary}</p>
          </div>
        </div>

        <DetailedAnalysis analysis={result.detailedAnalysis} />

        <p className="text-center text-xs text-muted-foreground">Your result has been recorded.</p>
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
