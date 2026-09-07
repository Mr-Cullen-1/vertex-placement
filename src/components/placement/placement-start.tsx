"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { VertexMark } from "./vertex-mark";
import { AssessmentShell } from "./assessment-shell";

interface PlacementStartProps {
  testTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  onContinue: () => void;
}

/** The welcome/ready screen — now composed inside the same
 * `AssessmentShell` frame the live test uses (Student Assessment
 * redesign), rather than an unrelated standalone centered page, so the
 * brand/sidebar/frame never visually reset between phases. Calm,
 * focused, one clear call to action, no clutter. */
export function PlacementStart({
  testTitle,
  durationMinutes,
  totalQuestions,
  onContinue,
}: PlacementStartProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AssessmentShell
      testTitle={testTitle}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebarCollapsed={() => setSidebarCollapsed((c) => !c)}
      sidebarBody={<TestSummary durationMinutes={durationMinutes} totalQuestions={totalQuestions} />}
      topBarStart={
        <div className="flex min-w-0 items-center gap-2 min-[1200px]:hidden">
          <VertexMark className="size-6" />
          <span className="truncate text-sm font-semibold text-foreground">{testTitle}</span>
        </div>
      }
    >
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 sm:px-6">
        <div className="flex w-full max-w-md animate-page-in flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ready to start?
            </h1>
            <p className="text-base text-muted-foreground">
              {testTitle} — an English placement assessment to help find your level.
            </p>
          </div>

          <dl className="grid w-full grid-cols-2 gap-3">
            <StatCard label="Duration" value={`${durationMinutes} min`} />
            <StatCard label="Questions" value={String(totalQuestions)} />
          </dl>

          <Button size="lg" className="h-11 w-full text-base" onClick={onContinue}>
            Begin
          </Button>

          <p className="text-xs text-muted-foreground">
            No account needed. Your result will be shown after you finish.
          </p>
        </div>
      </div>
    </AssessmentShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-card-border bg-card px-4 py-5 shadow-xs">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-2xl font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

export function TestSummary({
  durationMinutes,
  totalQuestions,
}: {
  durationMinutes: number;
  totalQuestions: number;
}) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
        <dt className="text-muted-foreground">Questions</dt>
        <dd className="font-semibold text-foreground tabular-nums">{totalQuestions}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="font-semibold text-foreground tabular-nums">{durationMinutes} min</dd>
      </div>
    </dl>
  );
}
