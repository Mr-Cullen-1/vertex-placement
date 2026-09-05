"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailIcon } from "lucide-react";
import type { StudentResultSummary } from "@/domain/results/types";
import { Button } from "@/components/ui/button";
import { VertexWordmark } from "@/components/placement/vertex-mark";
import { startPublicAttemptAction } from "@/server/actions/self-serve-actions";

const SUPPORT_CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL;

interface TryResultStepProps {
  result: StudentResultSummary;
  /** true after attempt 1 (one free attempt left, "Take again" offered);
   * false once both are used (see /docs/PHASE_2J_TRY_YOURSELF.md
   * "Limit reached" — never automatically starts attempt 2). */
  canRetake: boolean;
}

/** The `/try` hub's own result view — visually matches
 * `PlacementResult`'s card language (see /docs/DESIGN_SYSTEM.md) but is
 * a distinct component: the wording here ("1 free attempt remaining",
 * "Take again", "Contact administrator") is specific to the public
 * self-service quota and doesn't belong in the shared, origin-agnostic
 * Test Runner result screen a student lands on right after finishing
 * (`/placement/{token}`, unmodified — see requirement "Shared Test
 * Runner"). */
export function TryResultStep({ result, canRetake }: TryResultStepProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTakeAgain() {
    setError(null);
    setStarting(true);
    const started = await startPublicAttemptAction();
    if (!started.ok) {
      setStarting(false);
      setError(started.message);
      return;
    }
    router.push(`/placement/${started.data.token}`);
  }

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center overflow-y-auto px-6 py-8">
      <div className="flex w-full max-w-md animate-page-in flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <VertexWordmark />
          <p className="text-sm text-muted-foreground">
            {canRetake ? "1 free attempt remaining" : "Free attempts used"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          {result.level && (
            <span className="rounded-full bg-accent px-4 py-1 text-sm font-medium text-accent-foreground">
              {result.level}
            </span>
          )}
          <div className="mt-2 text-5xl font-semibold tracking-tight text-foreground tabular-nums">
            {result.rawScore}
            <span className="text-2xl font-normal text-muted-foreground"> / {result.totalQuestions}</span>
          </div>
          <p className="text-base text-muted-foreground">{Math.round(result.percentage)}% correct</p>
        </div>

        {canRetake ? (
          <div className="flex flex-col gap-3">
            {error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button size="lg" className="h-11 text-base" onClick={handleTakeAgain} disabled={starting}>
              {starting ? "Starting…" : "Take again"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 px-5 py-4 text-center">
            <p className="text-sm text-foreground">
              You&apos;ve completed both of your free placement attempts.
            </p>
            <p className="text-sm text-muted-foreground">
              To take another assessment or get access through your education center, please
              contact the administrator.
            </p>
            {SUPPORT_CONTACT_EMAIL && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`mailto:${SUPPORT_CONTACT_EMAIL}`} />}
              >
                <MailIcon />
                Contact administrator
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
