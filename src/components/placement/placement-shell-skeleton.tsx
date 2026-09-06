import { Skeleton } from "@/components/ui/skeleton";
import { VertexLoader } from "./vertex-loader";

/**
 * Route-level loading fallback for `/placement/[token]` — mirrors the
 * real `AssessmentShell` frame (bordered app surface, persistent sidebar
 * from `min-[1200px]`, top bar, centered workspace) so there's no layout
 * shift once real content arrives, whichever phase (ready/instructions/
 * active question) it turns out to be. Every placeholder uses the shared
 * animated shimmer (`Skeleton`), never a flat static block — see
 * /docs/DESIGN_SYSTEM.md "Loading system". `VertexLoader` fades in on its
 * own ~180ms-delayed schedule so a fast resolve never flashes it.
 */
export function PlacementShellSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-background p-0 sm:p-4 lg:p-6 xl:p-8 2xl:p-10">
      <div className="mx-auto flex w-full max-w-[1560px] overflow-hidden border-border bg-card sm:rounded-2xl sm:border sm:shadow-xs">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card min-[1200px]:flex">
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border p-5">
            <Skeleton className="size-7 rounded-[28%]" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex shrink-0 flex-col gap-2 p-4 pb-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-6 gap-2 p-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-6">
            <Skeleton className="h-8 w-24 shrink-0 rounded-lg min-[1200px]:hidden" />
            <div className="flex flex-1 justify-center">
              <Skeleton className="hidden h-4 w-28 sm:block" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-9 rounded-lg sm:w-24" />
            </div>
          </header>

          <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-8">
            <div className="flex w-full max-w-2xl flex-col items-center gap-10">
              <VertexLoader size="lg" label="Loading your assessment" />
              <div className="flex w-full flex-col gap-6">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-4/5" />
                <div className="mt-2 flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </main>

          <footer className="hidden shrink-0 items-center justify-between border-t border-border bg-card px-6 py-4 sm:flex">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </footer>
        </div>
      </div>
    </div>
  );
}
