import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { VertexMark } from "@/components/placement/vertex-mark";

const STEPS = [
  { key: "email", label: "Email" },
  { key: "verify", label: "Verify" },
  { key: "profile", label: "Profile" },
  { key: "start", label: "Start" },
] as const;

export type OnboardingStep = (typeof STEPS)[number]["key"];

const FACTS = ["70 questions", "30 minutes", "2 free completed attempts"];

/**
 * Correction pass — the shared shell for the "Try Yourself" self-service
 * wizard (email -> verify -> profile -> start), rebuilt to use the SAME
 * split-shell visual architecture as Admin Login (see
 * /docs/DESIGN_SYSTEM.md "Correction pass — Testora palette"): a deep
 * teal brand panel (left, ~45–50% desktop) with static, factual product
 * copy, and a light gray onboarding workspace (right) holding the step
 * indicator and the focused white card the caller renders as `children`.
 * On narrow viewports the brand panel collapses to a compact header
 * strip rather than a full-height column — see the `min-[900px]:flex-1`
 * pattern below, identical to the admin login page's own breakpoint.
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
    <div className="flex min-h-dvh flex-col bg-background min-[900px]:flex-row">
      {/* LEFT — brand, deep teal. Compact on mobile, full-height column
       * at 900px+ (mirrors admin login's own breakpoint). */}
      <div className="relative flex shrink-0 flex-col items-center justify-center gap-4 bg-primary px-6 py-8 text-primary-foreground min-[900px]:flex-1 min-[900px]:gap-6 min-[900px]:py-16">
        <Link
          href="/"
          className="absolute top-5 left-5 flex items-center gap-1.5 text-xs font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground sm:top-6 sm:left-6"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>

        <div className="flex flex-col items-center gap-3 text-center min-[900px]:gap-5">
          <VertexMark className="size-10 min-[900px]:size-14" />
          <div className="flex flex-col gap-1 min-[900px]:gap-1.5">
            <h1 className="text-lg font-semibold tracking-tight text-primary-foreground min-[900px]:text-2xl">
              Check your English level
            </h1>
            <p className="hidden text-sm text-primary-foreground/70 min-[900px]:block">
              A modern English placement assessment — no account needed.
            </p>
          </div>
        </div>

        <ul className="hidden flex-col items-center gap-2 min-[900px]:flex">
          {FACTS.map((fact) => (
            <li key={fact} className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <span aria-hidden className="size-1 rounded-full bg-primary-foreground/50" />
              {fact}
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT — onboarding workspace, light gray canvas. */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-8 min-[900px]:py-16">
        {step && (
          <div className="mb-6 w-full max-w-xs shrink-0 min-[900px]:max-w-sm">
            <OnboardingStepper current={step} />
          </div>
        )}

        <div className="flex w-full flex-1 items-center justify-center">{children}</div>
      </div>
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
                  active ? "size-2.5 bg-primary" : done ? "bg-primary/60" : "bg-disabled"
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
                  done ? "bg-primary/60" : "bg-disabled"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
