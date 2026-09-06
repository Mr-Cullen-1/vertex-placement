import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VertexWordmark } from "@/components/placement/vertex-mark";

const STEPS = [
  { key: "email", label: "Email" },
  { key: "verify", label: "Verify" },
  { key: "profile", label: "Profile" },
  { key: "start", label: "Start" },
] as const;

export type OnboardingStep = (typeof STEPS)[number]["key"];

/**
 * Redesign pass — the shared shell for the "Try Yourself" self-service
 * wizard (email -> verify -> profile -> start). Entering this flow means
 * the visitor has left the marketing landing page and entered the
 * product: no hero copy, no product screenshot, no marketing side panel
 * here — only a minimal wayfinding header, an optional step indicator,
 * and the auth-style card the caller renders as `children`. The card
 * itself remains the dominant visual element (see /docs/DESIGN_SYSTEM.md
 * "Onboarding shell").
 *
 * `step` is omitted for terminal views (result, unavailable, error) where
 * a linear step position no longer applies.
 */
export function OnboardingShell({
  step,
  children,
}: {
  step?: OnboardingStep;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-background">
      <header className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-8">
        <VertexWordmark className="scale-95 sm:scale-100" />
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>
      </header>

      {step && (
        <div className="mx-auto w-full max-w-xs shrink-0 px-6 pb-2 sm:max-w-sm">
          <OnboardingStepper current={step} />
        </div>
      )}

      <main className="flex flex-1 items-center justify-center px-6 py-6">{children}</main>
    </div>
  );
}

function OnboardingStepper({ current }: { current: OnboardingStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center" aria-label="Onboarding progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        const isLast = index === STEPS.length - 1;

        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "flex size-2 shrink-0 rounded-full transition-colors duration-200",
                  active ? "size-2.5 bg-primary" : done ? "bg-primary/60" : "bg-border"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-none font-medium whitespace-nowrap transition-colors duration-200",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "mx-1.5 h-px flex-1 -translate-y-2.5 transition-colors duration-200",
                  done ? "bg-primary/60" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
