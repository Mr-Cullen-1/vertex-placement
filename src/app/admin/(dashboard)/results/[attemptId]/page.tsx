import { notFound } from "next/navigation";
import { CheckIcon, XIcon } from "lucide-react";
import { getActorOrThrow } from "@/lib/actor";
import { getAdminResultDetail } from "@/server/services/attempt.service";
import { AttemptNotFoundError } from "@/server/errors";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercentage } from "@/lib/format";

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title={`${result.candidate.firstName} ${result.candidate.lastName}`}
        description={result.testTitle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 text-center">
            {result.level && <Badge>{result.level}</Badge>}
            <div className="text-4xl font-semibold tracking-tight text-foreground">
              {result.rawScore}
              <span className="text-lg font-normal text-muted-foreground"> / {result.totalQuestions}</span>
            </div>
            <p className="text-sm text-muted-foreground">{formatPercentage(result.percentage)} correct</p>
            <dl className="mt-2 grid w-full grid-cols-2 gap-3 text-left text-xs">
              <div>
                <dt className="text-muted-foreground">Completion time</dt>
                <dd className="font-medium text-foreground">
                  {minutes}m {seconds}s
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium text-foreground">
                  {result.status === "AUTO_SUBMITTED" ? "Auto-submitted (time up)" : "Submitted"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">{result.candidate.phoneNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Age</dt>
                <dd className="font-medium text-foreground">{result.candidate.age}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Topic performance</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle>Difficulty progression</CardTitle>
            </CardHeader>
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
        <CardHeader>
          <CardTitle>Question analysis</CardTitle>
        </CardHeader>
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
                    {q.isCorrect ? (
                      <CheckIcon className="size-4 text-success" />
                    ) : (
                      <XIcon className="size-4 text-destructive" />
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
