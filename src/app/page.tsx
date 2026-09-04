import Link from "next/link";
import { ArrowRightIcon, BarChart3Icon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VertexMark, VertexWordmark } from "@/components/placement/vertex-mark";

const SPEC_ITEMS = [
  { value: "70", label: "Questions" },
  { value: "30 min", label: "Duration" },
  { value: "6", label: "Levels" },
  { value: "Progressive", label: "Difficulty" },
];

// The product visual — an illustrative rendering of the actual student
// assessment interface (see src/components/placement/placement-question.tsx
// and answer-option.tsx for the real components this mirrors), not the
// admin dashboard. Values are abstract UI concepts (a question index, a
// countdown, a placement band), never a named person or a claimed
// production statistic — see /docs/PRODUCT_RULES.md.
const ANSWER_OPTIONS = ["lives", "has lived", "is living", "lived"];
const SELECTED_OPTION_INDEX = 1;

/** Marketing/informational landing page for the root route. Rebuilt
 * around the actual product — a structured, fixed-order, progressively
 * difficult placement assessment — rather than an admin-dashboard
 * showcase (see the redesign discussion: the dashboard is supporting,
 * not the hero visual). Vertex Placement has no public self-serve flow
 * — students only ever arrive via a one-time invitation link (see
 * /docs/ROUTES.md) — so "Admin login" is the only functional CTA on the
 * page; nothing here is a placeholder button. No invented customer
 * names/statistics anywhere (see ANSWER_OPTIONS/SPEC_ITEMS above), and
 * no "adaptive"/"AI" language — the test is fixed-order with
 * progressively difficult questions. Visual language (violet accent,
 * restrained atmospheric gradient, fine borders, generous spacing)
 * follows /docs/DESIGN_SYSTEM.md; design/DESIGN_REFERENCE.png (the
 * shared Vertex visual language, labeled "Vertex Quiz" — used for DNA
 * only, per DESIGN_SYSTEM.md's own caveat) is the reference, not a
 * separate Vertex Quiz codebase. */
export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-220px] left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <VertexWordmark />
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            Admin login
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </header>

        <section className="grid flex-1 grid-cols-1 items-center gap-16 py-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:py-12">
          <div className="flex flex-col items-start gap-7 text-left">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                English Placement Testing
              </span>
            </div>

            <h1 className="max-w-lg text-4xl leading-[1.12] font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              Know where every <span className="text-primary">student</span>{" "}
              <span className="font-normal text-foreground/60 italic">truly</span> stands
            </h1>

            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              Assess English level in 30 minutes with a structured placement test built for
              educational centers.
            </p>

            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/admin/login" />}
              className="rounded-full px-6"
            >
              Admin login
              <ArrowRightIcon />
            </Button>

            <dl className="grid w-full max-w-md grid-cols-4 divide-x divide-border border-t border-border pt-5">
              {SPEC_ITEMS.map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5 pl-4 first:pl-0">
                  <dt className="text-base font-semibold text-foreground sm:text-lg">
                    {item.value}
                  </dt>
                  <dd className="text-[11px] text-muted-foreground uppercase">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative z-10 rounded-[28px] border border-border bg-card p-5 shadow-xl shadow-primary/5 sm:p-6">
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

            <div className="absolute -right-8 -bottom-10 z-0 hidden w-48 rotate-2 rounded-2xl border border-border bg-card p-4 shadow-lg xl:block">
              <div className="flex items-center justify-between pb-2.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase">
                  Placement result
                </span>
                <BarChart3Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-primary">B2</span>
                <span className="text-xs text-muted-foreground">Upper-Intermediate</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Vertex Placement — professional English placement testing for educational centers.
      </footer>
    </div>
  );
}
