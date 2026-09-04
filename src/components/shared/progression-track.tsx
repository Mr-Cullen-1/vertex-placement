import { cn } from "@/lib/utils";

export interface ProgressionTrackBand {
  order: number;
  label: string;
  minQuestion?: number;
  maxQuestion?: number;
}

interface ProgressionTrackProps {
  bands: readonly ProgressionTrackBand[];
  /** `order` of the candidate's reached band, or `null` if no question
   * was answered correctly (below the lowest band). */
  currentOrder: number | null;
  /** Hides the "Questions N–M" sub-label — used on the compact student
   * result card where that detail isn't the point. */
  compact?: boolean;
}

/**
 * A shared horizontal stepper for the six source progression bands —
 * used on both the student result and the admin result detail so the
 * same visual language represents the same underlying data (see
 * /docs/PHASE_2E.md). This is presentation only: it never computes or
 * infers a band itself, only renders whatever `currentOrder` the
 * caller already derived from `computeAnswerBreakdown`.
 *
 * Deliberately visually distinct from a score/percentage bar — this is
 * descriptive question-progression guidance, not a CEFR score cutoff
 * (see /docs/PRODUCT_RULES.md "Critical terminology"). Never labelled
 * or styled as a certification.
 */
export function ProgressionTrack({ bands, currentOrder, compact }: ProgressionTrackProps) {
  return (
    <ol className="flex w-full items-start justify-between gap-1">
      {bands.map((band, index) => {
        const reached = currentOrder !== null && band.order <= currentOrder;
        const isCurrent = currentOrder !== null && band.order === currentOrder;
        const isLast = index === bands.length - 1;

        return (
          <li key={band.order} className="flex flex-1 flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 transition-colors duration-200",
                  index === 0 ? "opacity-0" : reached ? "bg-primary" : "bg-border"
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition-colors duration-200",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : reached
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-background text-muted-foreground"
                )}
              >
                {index + 1}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 transition-colors duration-200",
                  isLast ? "opacity-0" : reached && !isCurrent ? "bg-primary" : "bg-border"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[11px] leading-tight font-medium",
                isCurrent ? "text-foreground" : reached ? "text-foreground/80" : "text-muted-foreground"
              )}
            >
              {band.label}
            </span>
            {!compact && band.minQuestion !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                Q{band.minQuestion}–{band.maxQuestion}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
