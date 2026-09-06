"use client";

import { useState } from "react";
import { ChevronDownIcon, CheckIcon, XIcon, MinusIcon, AlertTriangleIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudentDetailedAnalysis } from "@/domain/results/types";

/**
 * Collapsed-by-default "Detailed analysis" section on the student result
 * screen (Phase 2L). Everything here is DIAGNOSTIC — none of it is (or
 * looks like) the Recommended Level, which is shown above this section,
 * unaffected by anything the student expands here. See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Student Detailed Analysis").
 */
export function DetailedAnalysis({ analysis }: { analysis: StudentDetailedAnalysis }) {
  const [open, setOpen] = useState(false);
  const { courseLevelPerformance, strengthWeakness, questionReview, limitedCoverage } = analysis;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger className="px-4 py-3.5">
        <span className="text-sm font-medium text-foreground">Detailed analysis</span>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-5 border-t border-border px-4 pt-4 pb-5">
          {limitedCoverage && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-xs text-warning-foreground ring-1 ring-warning/25">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <p>Your result is based on limited coverage of the test.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5 rounded-xl bg-muted/40 px-3.5 py-3">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Strongest area
              </span>
              <span className="text-sm font-medium text-foreground">
                {strengthWeakness.strongestLabel ?? "Limited evidence"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-xl bg-muted/40 px-3.5 py-3">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Needs most improvement
              </span>
              <span className="text-sm font-medium text-foreground">
                {strengthWeakness.weakestLabel ?? "Limited evidence"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">Performance by course level</h3>
            <ul className="flex flex-col gap-1.5">
              {courseLevelPerformance.map((entry) => (
                <li
                  key={entry.label}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">{entry.label}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {entry.correct} / {entry.total} correct
                    </span>
                    {qualitativeBadge(entry)}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <QuestionReviewSection entries={questionReview} />

          <p className="text-center text-[11px] text-muted-foreground">
            This diagnostic breakdown does not determine your Recommended Level.
          </p>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function qualitativeBadge(entry: StudentDetailedAnalysis["courseLevelPerformance"][number]) {
  if (entry.attemptedAccuracy === null) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }
  if (entry.attemptedAccuracy >= 80) return <Badge variant="success">Strong</Badge>;
  if (entry.attemptedAccuracy >= 50) return <Badge variant="info">Developing</Badge>;
  return <Badge variant="warning">Needs improvement</Badge>;
}

function QuestionReviewSection({
  entries,
}: {
  entries: StudentDetailedAnalysis["questionReview"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-2">
      <CollapsibleTrigger className="rounded-lg bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-foreground">Review your answers</span>
        <ChevronDownIcon
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <ul className="flex flex-col gap-1.5 pt-1">
          {entries.map((entry) => (
            <QuestionReviewRow key={entry.order} entry={entry} />
          ))}
        </ul>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function QuestionReviewRow({ entry }: { entry: StudentDetailedAnalysis["questionReview"][number] }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/70 bg-background/40"
    >
      <CollapsibleTrigger className="px-3 py-2">
        <span className="text-xs font-medium text-foreground">Question {entry.order}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusIndicator status={entry.status} />
          <ChevronDownIcon
            className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="flex flex-col gap-2 border-t border-border/70 px-3 py-2.5 text-xs">
          <p className="text-foreground">{entry.prompt}</p>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Your answer</span>
            <span className={cn("font-medium", entry.status === "INCORRECT" ? "text-destructive" : "text-foreground")}>
              {entry.selectedAnswerText ?? "Not answered"}
            </span>
          </div>
          {entry.status !== "CORRECT" && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Correct answer</span>
              <span className="font-medium text-success">{entry.correctAnswerText}</span>
            </div>
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function StatusIndicator({ status }: { status: "CORRECT" | "INCORRECT" | "UNANSWERED" }) {
  if (status === "CORRECT") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-success">
        <CheckIcon className="size-3.5" />
        Correct
      </span>
    );
  }
  if (status === "INCORRECT") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-destructive">
        <XIcon className="size-3.5" />
        Incorrect
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <MinusIcon className="size-3.5" />
      Unanswered
    </span>
  );
}
