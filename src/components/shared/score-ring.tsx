import { cn } from "@/lib/utils";

interface ScoreRingProps {
  /** 0–100. Purely presentational — the caller already computed this. */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A restrained circular progress ring — hand-built SVG, no charting
 * library (see /docs/DESIGN_SYSTEM.md "Charts"). Used as the visual
 * anchor behind the student result's score, never as a second placement
 * signal: it always renders the same `percentage` already shown as text
 * next to it, nothing is inferred or recomputed here.
 */
export function ScoreRing({ percentage, size = 152, strokeWidth = 10, className, children }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
