import { notFound } from "next/navigation";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CheckIcon,
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
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeading } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProgressionTrack } from "@/components/shared/progression-track";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Assessment report"
        title={`${result.candidate.firstName} ${result.candidate.lastName}`}
        description={result.testTitle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeading icon={TrophyIcon} title="Score" />
          <CardContent className="flex flex-col items-center gap-2 text-center">
            {result.level && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Placement band
                </span>
                <Badge>{result.level}</Badge>
              </div>
            )}
            <div className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">
              {result.rawScore}
              <span className="text-lg font-normal text-muted-foreground"> / {result.totalQuestions}</span>
            </div>
            <p className="text-sm text-muted-foreground">{formatPercentage(result.percentage)} correct</p>
            <dl className="mt-2 grid w-full grid-cols-2 gap-3 text-left text-xs">
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
                <dt className="text-muted-foreground">Correct</dt>
                <dd className="font-medium text-foreground">{result.progression.correctCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Incorrect</dt>
                <dd className="font-medium text-foreground">{result.progression.incorrectCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unanswered</dt>
                <dd className="font-medium text-foreground">{result.progression.unansweredCount}</dd>
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

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeading icon={CompassIcon} title="Question progression evidence" description="Diagnostic only" />
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                This does not determine placement. Official placement is the <strong>Placement
                band</strong> above, based on total correct score — never on which specific
                question was answered correctly.
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
            <CardHeading icon={LayersIcon} title="Topic performance" />
            <CardContent>
              {result.topicPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topic metadata on this test&apos;s questions.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {result.topicPerformance.map((t) => (
                    <li key={t.topic} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{t.topic}</span>
                      <span className="font-medium text-foreground">
                        {t.correct}/{t.total} ({formatPercentage(t.percentage)})
                      </span>
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
                <ul className="flex flex-col gap-2">
                  {result.difficultyProgression.map((band) => (
                    <li key={band.band} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{band.band}</span>
                      <span className="font-medium text-foreground">
                        {band.correct}/{band.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeading icon={ListChecksIcon} title="Question analysis" description={`${result.questionAnalysis.length} questions`} />
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Selected</TableHead>
                <TableHead>Correct answer</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.questionAnalysis.map((q) => (
                <TableRow key={q.questionId}>
                  <TableCell className="text-muted-foreground">{q.order}</TableCell>
                  <TableCell className="max-w-xs whitespace-normal">{q.prompt}</TableCell>
                  <TableCell className="max-w-40 whitespace-normal">{q.selectedOptionText ?? "—"}</TableCell>
                  <TableCell className="max-w-40 whitespace-normal">{q.correctOptionText}</TableCell>
                  <TableCell>
                    {!q.isAnswered ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MinusIcon className="size-4" />
                        Unanswered
                      </span>
                    ) : q.isCorrect ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckIcon className="size-4" />
                        Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <XIcon className="size-4" />
                        Incorrect
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
