import { notFound } from "next/navigation";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CheckIcon,
  ClipboardCheckIcon,
  CompassIcon,
  LayersIcon,
  ListChecksIcon,
  MinusIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react";
import { getActorOrThrow } from "@/lib/actor";
import { getAdminResultDetail } from "@/server/services/attempt.service";
import { AttemptNotFoundError } from "@/server/errors";
import { PROGRESSION_BANDS } from "@/domain/placement/progression";
import type { QuestionAnalysisEntry } from "@/domain/results/types";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProgressionTrack } from "@/components/shared/progression-track";
import { FinalPlacementControl } from "@/components/admin/results/final-placement-control";
import { formatDateTime, formatPercentage } from "@/lib/format";

/** Admin-only result detail — intentionally shows the answer key and
 * per-question correctness, which the student-facing result screen never
 * does (see /docs/PHASE_2A.md and the Phase 2B brief section 12). */
export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const actor = await getActorOrThrow();

  let result;
  try {
    result = await getAdminResultDetail(actor, attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) notFound();
    throw error;
  }

  const minutes = Math.floor(result.completionSeconds / 60);
  const seconds = result.completionSeconds % 60;

  // Heuristic UI-only caution — never fed back into scoring/progression
  // logic. `progressionBand` is derived purely from the HIGHEST correctly
  // answered question order (see /domain/placement/progression.ts); with
  // very little of the test actually answered, a single lucky correct
  // answer can surface a mid-test band even though almost nothing was
  // attempted. Flag that specific situation rather than silently
  // presenting the band as if it reflected the whole attempt. See
  // /docs/DESIGN_SYSTEM.md "Result detail — placement semantics".
  const answeredRatio = result.totalQuestions > 0 ? result.progression.answeredCount / result.totalQuestions : 0;
  const isThinEvidence = result.progression.progressionBand !== null && answeredRatio < 0.2;

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6 p-4 md:p-8 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Assessment report"
        title={`${result.candidate.firstName} ${result.candidate.lastName}`}
        description={result.testTitle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeading icon={TrophyIcon} title="Objective result" description="Score-based, immutable" />
            <CardContent className="flex flex-col items-center gap-3 text-center">
              {result.level && (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-overline text-primary">Recommended level</span>
                  <span className="text-3xl font-semibold tracking-tight text-foreground">{result.level}</span>
                </div>
              )}
              <div className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">
                {result.rawScore}
                <span className="text-lg font-normal text-muted-foreground"> / {result.totalQuestions}</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatPercentage(result.percentage)} correct</p>

              <dl className="mt-2 grid w-full grid-cols-3 gap-3 text-center">
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-2 py-2">
                  <dt className="text-xs text-muted-foreground">Correct</dt>
                  <dd className="text-sm font-semibold text-foreground">{result.progression.correctCount}</dd>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-2 py-2">
                  <dt className="text-xs text-muted-foreground">Incorrect</dt>
                  <dd className="text-sm font-semibold text-foreground">{result.progression.incorrectCount}</dd>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-2 py-2">
                  <dt className="text-xs text-muted-foreground">Unanswered</dt>
                  <dd className="text-sm font-semibold text-foreground">{result.progression.unansweredCount}</dd>
                </div>
              </dl>

              <dl className="grid w-full grid-cols-2 gap-3 text-left text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Answered</dt>
                  <dd className="font-medium text-foreground">
                    {result.progression.answeredCount} / {result.totalQuestions}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Completion time</dt>
                  <dd className="font-medium text-foreground">
                    {minutes}m {seconds}s
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submission type</dt>
                  <dd className="font-medium text-foreground">
                    {result.status === "AUTO_SUBMITTED" ? "Automatic (time limit)" : "Manual"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Started</dt>
                  <dd className="font-medium text-foreground">{formatDateTime(result.startedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Completed</dt>
                  <dd className="font-medium text-foreground">{formatDateTime(result.completedAt)}</dd>
                </div>
              </dl>

              <dl className="grid w-full grid-cols-2 gap-3 border-t border-border pt-3 text-left text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium text-foreground">{result.candidate.phoneNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Age</dt>
                  <dd className="font-medium text-foreground">{result.candidate.age}</dd>
                </div>
                {result.candidate.email && (
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-medium text-foreground">{result.candidate.email}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeading icon={ClipboardCheckIcon} title="Final Placement" description="Administrative decision" />
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Defaults to the Recommended Level above. Override only if institutional judgment
                differs — this never changes the raw score or Recommended Level.
              </p>
              <FinalPlacementControl attemptId={result.attemptId} finalPlacement={result.finalPlacement} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeading icon={LayersIcon} title="Topic performance" />
              <CardContent>
                {result.topicPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topic metadata on this test&apos;s questions.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {result.topicPerformance.map((t) => (
                      <li key={t.topic} className="flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{t.topic}</span>
                          <span className="font-medium text-foreground">
                            {t.correct}/{t.total} ({formatPercentage(t.percentage)})
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeading icon={BarChart3Icon} title="Difficulty progression" />
              <CardContent>
                {result.difficultyProgression.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No difficulty-band metadata on this test&apos;s questions.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {result.difficultyProgression.map((band) => {
                      const pct = band.total > 0 ? (band.correct / band.total) * 100 : 0;
                      return (
                        <li key={band.band} className="flex flex-col gap-1.5 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{band.band}</span>
                            <span className="font-medium text-foreground">
                              {band.correct}/{band.total}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeading icon={CompassIcon} title="Question progression evidence" description="Diagnostic only" />
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                This does not determine placement. The official recommendation is the{" "}
                <strong>Recommended Level</strong> above, based on total correct score — never on
                which specific question was answered correctly.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">Highest correctly answered question:</span>
                <span className="font-medium text-foreground">
                  {result.progression.highestCorrectQuestionOrder !== null
                    ? `Q${result.progression.highestCorrectQuestionOrder}`
                    : "None"}
                </span>
              </div>
              <div className="rounded-xl bg-muted/30 px-4 py-5">
                <ProgressionTrack
                  bands={PROGRESSION_BANDS}
                  currentOrder={result.progression.progressionBand?.order ?? null}
                />
              </div>
              {isThinEvidence && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground ring-1 ring-warning/25">
                  <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Only {result.progression.answeredCount} of {result.totalQuestions} questions
                    were answered. This band reflects very limited evidence and should not be
                    treated as a reliable placement signal.
                  </p>
                </div>
              )}
              {result.progression.progressionBand === null && (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  No question was answered correctly — below the Beginner range. Teacher review
                  recommended rather than an assumed starting level.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeading
              icon={LayersIcon}
              title="Performance by course level"
              description="Diagnostic only — never determines placement"
            />
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    Strongest area
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {result.strengthWeakness.strongestLabel ?? "Limited evidence"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    Needs most improvement
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {result.strengthWeakness.weakestLabel ?? "Limited evidence"}
                  </span>
                </div>
              </div>
              <ul className="flex flex-col gap-2.5">
                {result.courseLevelPerformance.map((entry) => (
                  <li key={entry.label} className="flex flex-col gap-1.5 rounded-lg bg-muted/30 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="min-w-0 truncate font-medium text-foreground">{entry.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {entry.correct}/{entry.total} correct
                        {entry.unanswered > 0 && ` · ${entry.unanswered} unanswered`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${entry.percentageOfTotal}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeading icon={ListChecksIcon} title="Question analysis" description={`${result.questionAnalysis.length} questions`} />
        <CardContent>
          {/* Selected/Correct merged into one "Answer" column — with a
           * long prompt and two full option strings, five independent
           * columns can't stay readable AND fit the viewport at once
           * (see /docs/DESIGN_SYSTEM.md "No horizontal scrolling"). Below
           * `lg`, a stacked card per question replaces the table
           * entirely rather than squeezing further. */}
          <div className="hidden lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-[42%]">Question</TableHead>
                  <TableHead className="w-[33%]">Answer</TableHead>
                  <TableHead className="w-[15%]">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.questionAnalysis.map((q) => (
                  <TableRow key={q.questionId}>
                    <TableCell className="whitespace-normal text-muted-foreground">{q.order}</TableCell>
                    <TableCell className="whitespace-normal">{q.prompt}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col gap-1 text-xs">
                        <span>
                          <span className="text-muted-foreground">Selected: </span>
                          {q.selectedOptionText ?? "—"}
                        </span>
                        <span>
                          <span className="text-muted-foreground">Correct: </span>
                          {q.correctOptionText}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <QuestionResultBadge q={q} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden">
            {result.questionAnalysis.map((q) => (
              <li key={q.questionId} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Q{q.order}</span>
                  <QuestionResultBadge q={q} />
                </div>
                <p className="pt-1.5 text-sm text-foreground">{q.prompt}</p>
                <div className="flex flex-col gap-1 pt-2 text-xs">
                  <span>
                    <span className="text-muted-foreground">Selected: </span>
                    {q.selectedOptionText ?? "—"}
                  </span>
                  <span>
                    <span className="text-muted-foreground">Correct: </span>
                    {q.correctOptionText}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionResultBadge({ q }: { q: QuestionAnalysisEntry }) {
  if (!q.isAnswered) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MinusIcon className="size-4" />
        Unanswered
      </span>
    );
  }
  if (q.isCorrect) {
    return (
      <span className="flex items-center gap-1 text-xs text-success">
        <CheckIcon className="size-4" />
        Correct
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <XIcon className="size-4" />
      Incorrect
    </span>
  );
}
