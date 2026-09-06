import { cn } from "@/lib/utils";
import { STANDARD_PLACEMENT_LEVELS } from "@/domain/placement/levels";

/**
 * The six standard Vertex levels as a restrained horizontal scale,
 * highlighting the Recommended Level. Deliberately a SEPARATE component
 * from `ProgressionTrack` (which visualizes the question-position-based
 * diagnostic signal) even though the visual language rhymes — mixing the
 * two data sources was exactly the bug Phase 2L fixed (a 4/70 result
 * showing "Advanced" because of one late question). This component only
 * ever reads `level`, the score-based Recommended Level string, never a
 * question index. See /docs/PHASE_2L_SCORING_POLICY.md.
 */
export function LevelScale({ level }: { level: string | null }) {
  const currentIndex = level ? STANDARD_PLACEMENT_LEVELS.indexOf(level as (typeof STANDARD_PLACEMENT_LEVELS)[number]) : -1;

  return (
    <ol className="flex w-full items-start justify-between gap-1">
      {STANDARD_PLACEMENT_LEVELS.map((label, index) => {
        const reached = currentIndex >= 0 && index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === STANDARD_PLACEMENT_LEVELS.length - 1;

        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span
                aria-hidden
                className={cn("h-px flex-1 transition-colors duration-200", index === 0 ? "opacity-0" : reached ? "bg-primary" : "bg-border")}
              />
              <span
                aria-hidden
                className={cn(
                  "flex size-2.5 shrink-0 rounded-full border-2 transition-colors duration-200",
                  isCurrent ? "border-primary bg-primary" : reached ? "border-primary/60 bg-primary/30" : "border-border bg-background"
                )}
              />
              <span
                aria-hidden
                className={cn("h-px flex-1 transition-colors duration-200", isLast ? "opacity-0" : reached && !isCurrent ? "bg-primary" : "bg-border")}
              />
            </div>
            <span
              className={cn(
                "text-[10px] leading-tight font-medium",
                isCurrent ? "text-foreground" : reached ? "text-foreground/80" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
