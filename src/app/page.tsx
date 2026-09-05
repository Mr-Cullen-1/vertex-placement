import Link from "next/link";
import { Caveat } from "next/font/google";
import {
  ArrowRightIcon,
  BarChart3Icon,
  BookmarkIcon,
  ClockIcon,
  GraduationCapIcon,
  LinkIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VertexMark, VertexWordmark } from "@/components/placement/vertex-mark";

// Used only for the small hand-drawn-style annotations beside the
// product visual (see design/new reference.png) — no other UI on the
// page uses it, so it's loaded here rather than in the root layout.
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] });

const FEATURES = [
  {
    icon: BarChart3Icon,
    title: "Accurate placement",
    description: "Understand each student's level with a structured test.",
  },
  {
    icon: LinkIcon,
    title: "Simple and secure",
    description: "Create invitation links and track progress in real time.",
  },
  {
    icon: UsersIcon,
    title: "Build for educational centers",
    description: "Designed for language schools and educational institutions.",
  },
  {
    icon: GraduationCapIcon,
    title: "Actionable results",
    description: "Get clear placement levels and support better learning paths.",
  },
];

// The product visual — an illustrative rendering of the real assessment
// experience (fixed-order questions, progressively increasing
// difficulty, automatic band scoring; see src/components/placement/).
// Every value here is an abstract UI concept (a question index, a
// countdown, a placement band), never a named person or a claimed
// production statistic — see /docs/PRODUCT_RULES.md.
const LEVELS = ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Upper Intermediate", "Advanced"];
const CURRENT_LEVEL_INDEX = 3;
const ANSWER_OPTIONS = ["lives", "has lived", "is living", "lived"];
const SELECTED_OPTION_INDEX = 1;

/** Marketing/informational landing page for the root route — a single,
 * scroll-free hero screen (per the latest visual refinement: no stats
 * strip, no footer, everything above the fold), reproducing the
 * updated reference as closely as technically possible: a floating
 * pill navbar, the layered product-visual concept, hand-drawn
 * annotations, and an atmospheric background. Phase 2J added a "Try
 * Yourself" CTA (public self-service placement — see
 * /docs/PHASE_2J_TRY_YOURSELF.md) alongside the existing "Admin login"
 * control; a targeted addition to the existing hero/action hierarchy,
 * not a redesign — same branding, typography, motion, and responsive
 * behavior as before. No invented customer names or statistics anywhere.
 * No "adaptive"/"AI" language — the test is fixed-order with
 * progressively increasing difficulty. */
export default function Home() {
  return (
    <div className="relative flex h-dvh flex-col overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white to-[oklch(0.97_0.012_292.7)]">
      {/* Atmospheric background — soft violet glow + a faint abstract
       * "architecture" motif, standing in for the reference's layered
       * translucent shapes without a photographic/stock asset. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-160px] right-[-8%] -z-10 h-[680px] w-[860px] rounded-full bg-primary/[0.09] blur-3xl"
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 -z-10 h-[420px] w-[520px] text-primary/[0.08]"
        viewBox="0 0 520 420"
        fill="none"
      >
        <path d="M520 420 L360 420 L430 120 L520 60 Z" fill="currentColor" />
        <path d="M420 420 L300 420 L385 150 L420 130 Z" fill="currentColor" opacity="0.7" />
        <line x1="520" y1="120" x2="300" y2="420" stroke="currentColor" strokeWidth="1" />
        <line x1="480" y1="90" x2="270" y2="420" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 sm:px-10 xl:px-16">
        <header className="mt-6 flex shrink-0 items-center justify-between gap-4 rounded-full border border-border bg-card/90 px-6 py-3 shadow-sm backdrop-blur-sm sm:mt-8 sm:px-8">
          <VertexWordmark />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/admin/login" />}
              className="rounded-full px-5"
            >
              Admin login
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/try" />}
              className="rounded-full px-5 shadow-lg shadow-primary/25"
            >
              Try Yourself
              <ArrowRightIcon />
            </Button>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 items-center gap-16 py-6 xl:grid-cols-[1fr_1.5fr] xl:gap-10 xl:py-10">
          <div className="flex flex-col items-start gap-6 text-left">
            <span className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              English Placement Testing
            </span>

            <h1 className="max-w-lg text-4xl leading-[1.12] font-semibold tracking-tight text-foreground sm:text-5xl">
              Know where every
              <br />
              <span className="text-primary">student</span>{" "}
              <span className="font-normal italic">truly</span> stands
            </h1>

            <p className="max-w-md text-base text-muted-foreground">
              A modern English placement test for educational centers. 70 questions. 30
              minutes. Clear results. Confident next steps.
            </p>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <feature.icon className="size-4.5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{feature.title}</span>
                    <span className="text-xs text-muted-foreground">{feature.description}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/try" />}
                className="rounded-full px-6 shadow-lg shadow-primary/25"
              >
                Try Yourself
                <ArrowRightIcon />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/admin/login" />}
                className="rounded-full px-6"
              >
                Admin login
              </Button>
            </div>
          </div>

          <div className="relative hidden w-full xl:block">
            {/* Progression card */}
            <div className="absolute top-14 left-0 z-10 w-36 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
              <p className="pb-3 text-xs font-semibold text-foreground">Progression</p>
              <ul className="relative flex flex-col gap-3.5">
                <span className="absolute top-1 bottom-1 left-[3px] w-px bg-border" />
                {LEVELS.map((level, index) => {
                  const reached = index <= CURRENT_LEVEL_INDEX;
                  const current = index === CURRENT_LEVEL_INDEX;
                  return (
                    <li key={level} className="relative flex items-center gap-2.5 pl-4">
                      <span
                        className={cn(
                          "absolute left-0 size-[7px] rounded-full",
                          reached ? "bg-primary" : "bg-border"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[11px] leading-none",
                          current
                            ? "font-semibold text-foreground"
                            : reached
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50"
                        )}
                      >
                        {level}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Main test card */}
            <div className="relative z-20 mr-40 ml-40 rounded-[28px] border border-border bg-card p-5 shadow-2xl shadow-primary/10 sm:p-6">
              <div className="flex items-center justify-between pb-5">
                <div className="flex items-center gap-2">
                  <VertexMark className="size-7" />
                  <span className="text-sm font-semibold text-foreground">
                    English Placement Test
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  18:24
                </div>
              </div>

              <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
                <span>Question 24 of 70</span>
                <span>Intermediate</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[34%] rounded-full bg-primary" />
              </div>

              <p className="pt-6 pb-5 text-xl font-medium text-foreground">
                She <span className="text-muted-foreground">___</span> in London since 2019.
              </p>

              <div className="flex flex-col gap-2.5">
                {ANSWER_OPTIONS.map((option, index) => {
                  const selected = index === SELECTED_OPTION_INDEX;
                  return (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
                        selected
                          ? "border-primary bg-accent text-foreground"
                          : "border-border text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BookmarkIcon className="size-3.5" />
                  Mark for review
                </span>
                <Button size="sm" nativeButton={false} render={<span />} className="rounded-full px-4">
                  Next question
                  <ArrowRightIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Result card */}
            <div className="absolute top-20 right-0 z-10 w-44 rounded-2xl border border-border bg-card p-4 shadow-lg">
              <p className="pb-3 text-[11px] font-medium text-muted-foreground">Your result</p>
              <div className="flex items-center gap-2 pb-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <BarChart3Icon className="size-4" />
                </span>
                <span className="text-sm leading-tight font-semibold text-foreground">
                  Upper
                  <br />
                  Intermediate
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Score</p>
              <p className="pb-2 text-2xl font-semibold text-foreground">
                62 <span className="text-sm font-normal text-muted-foreground">/ 70</span>
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[88%] rounded-full bg-primary" />
              </div>
              <p className="pt-3 text-[11px] text-muted-foreground">
                Ready for the next step in your English journey.
              </p>
            </div>

            {/* Hand-drawn annotations — positioned beside the progression/result
             * cards' own footprint (never under the main card), with a
             * higher z-index as a safety margin. */}
            <div
              className={cn(
                "absolute top-[300px] left-0 z-30 w-36 text-primary/80",
                caveat.className
              )}
            >
              <svg
                aria-hidden
                viewBox="0 0 40 40"
                className="absolute -top-9 left-8 h-9 w-9 text-primary/60"
                fill="none"
              >
                <path
                  d="M4 34 C10 14, 26 6, 36 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M28 3 L36 4 L33 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-lg leading-tight">Progressive difficulty</p>
              <p className="text-lg leading-tight">from Beginner to Advanced</p>
            </div>

            <div className={cn("absolute top-[330px] right-0 z-30 w-44 text-primary/80", caveat.className)}>
              <svg
                aria-hidden
                viewBox="0 0 40 40"
                className="absolute -top-8 right-8 h-8 w-8 text-primary/60"
                fill="none"
              >
                <path
                  d="M4 34 C10 14, 26 6, 36 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M28 3 L36 4 L33 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-lg leading-tight">Clear levels.</p>
              <p className="text-lg leading-tight">Brighter opportunities.</p>
            </div>
          </div>

          {/* Compact product visual for < xl — the main test card only,
           * matching the reference's intent that the visual "transform
           * naturally into a compact assessment preview" on smaller
           * screens rather than cramming the full layered composition. */}
          <div className="w-full xl:hidden">
            <div className="mx-auto max-w-md rounded-[28px] border border-border bg-card p-5 shadow-2xl shadow-primary/10 sm:p-6">
              <div className="flex items-center justify-between pb-5">
                <div className="flex items-center gap-2">
                  <VertexMark className="size-7" />
                  <span className="text-sm font-semibold text-foreground">
                    English Placement Test
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  18:24
                </div>
              </div>

              <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground">
                <span>Question 24 of 70</span>
                <span>Intermediate</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[34%] rounded-full bg-primary" />
              </div>

              <p className="pt-6 pb-5 text-xl font-medium text-foreground">
                She <span className="text-muted-foreground">___</span> in London since 2019.
              </p>

              <div className="flex flex-col gap-2.5">
                {ANSWER_OPTIONS.map((option, index) => {
                  const selected = index === SELECTED_OPTION_INDEX;
                  return (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
                        selected
                          ? "border-primary bg-accent text-foreground"
                          : "border-border text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
