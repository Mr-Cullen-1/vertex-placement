"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const WARNING_THRESHOLD_SECONDS = 5 * 60;
const CRITICAL_THRESHOLD_SECONDS = 60;

interface PlacementTimerProps {
  /** Server-issued deadline (PlacementAttempt.expiresAt). The ONLY source
   * of truth for how much time is left — this component never accepts a
   * duration and counts down locally from it; it recomputes the
   * remaining time from `expiresAt` vs `Date.now()` every tick, so
   * throttled background tabs or clock drift self-correct instead of
   * compounding. Purely a visual representation — the backend
   * independently re-validates `expiresAt` on every request regardless
   * of what this component displays (see /docs/PHASE_2A.md "Timer"). */
  expiresAt: string;
  /** Called exactly once, when the client-side countdown reaches zero.
   * The caller is responsible for calling the actual submit action — this
   * component never finalizes anything itself. */
  onExpire: () => void;
}

export function PlacementTimer({ expiresAt, onExpire }: PlacementTimerProps) {
  // `expiresAt` is the server-issued deadline and isn't expected to
  // change after mount; recomputed as a plain value (not a ref) so it's
  // safe to read during render.
  const deadline = new Date(expiresAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() => deadline - Date.now());
  const hasExpiredRef = useRef(false);
  const announceRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedRef = useRef<"none" | "warning" | "critical">("none");

  useEffect(() => {
    const tick = () => {
      const next = deadline - Date.now();
      setRemainingMs(next);
      if (next <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const state: "normal" | "warning" | "critical" =
    remainingSeconds <= CRITICAL_THRESHOLD_SECONDS
      ? "critical"
      : remainingSeconds <= WARNING_THRESHOLD_SECONDS
        ? "warning"
        : "normal";

  // Announce threshold crossings only — never every tick, to avoid
  // spamming screen readers (see /docs/PHASE_2A.md "Accessibility").
  useEffect(() => {
    if (state !== "normal" && lastAnnouncedRef.current !== state && announceRef.current) {
      announceRef.current.textContent =
        state === "critical" ? "Less than one minute remaining." : "Five minutes remaining.";
      lastAnnouncedRef.current = state;
    }
  }, [state]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-sm font-medium tabular-nums transition-colors",
        state === "normal" && "border-border bg-card text-foreground",
        state === "warning" && "border-warning/40 bg-warning/10 text-warning-foreground",
        state === "critical" && "animate-pulse border-destructive/40 bg-destructive/10 text-destructive"
      )}
    >
      <ClockIcon className="size-4 shrink-0" />
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{minutes} minutes {seconds} seconds remaining</span>
      <div ref={announceRef} role="status" aria-live="polite" className="sr-only" />
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
