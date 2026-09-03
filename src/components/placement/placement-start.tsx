import { Button } from "@/components/ui/button";
import { VertexMark } from "./vertex-mark";

interface PlacementStartProps {
  testTitle: string;
  durationMinutes: number;
  totalQuestions: number;
  onContinue: () => void;
}

/** The welcome screen — calm, focused, premium EdTech, per
 * /docs/DESIGN_SYSTEM.md. One clear call to action, no clutter. */
export function PlacementStart({
  testTitle,
  durationMinutes,
  totalQuestions,
  onContinue,
}: PlacementStartProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <VertexMark className="size-12 text-primary" />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Vertex Placement
          </h1>
          <p className="text-base text-muted-foreground">
            {testTitle} — an English placement assessment to help find your
            level.
          </p>
        </div>

        <dl className="grid w-full grid-cols-2 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Duration
            </dt>
            <dd className="text-2xl font-semibold text-foreground">{durationMinutes} min</dd>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-4 py-5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Questions
            </dt>
            <dd className="text-2xl font-semibold text-foreground">{totalQuestions}</dd>
          </div>
        </dl>

        <Button size="lg" className="h-11 w-full text-base" onClick={onContinue}>
          Begin
        </Button>

        <p className="text-xs text-muted-foreground">
          No account needed. Your result will be shown after you finish.
        </p>
      </div>
    </div>
  );
}
