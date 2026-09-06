import { Skeleton } from "@/components/ui/skeleton";

/** Skeletons approximate the real page's layout (header + interactive
 * list/cards) so there's minimal content shift once data arrives, and
 * the app canvas renders immediately instead of a blank flash. Every
 * skeleton uses `Skeleton`'s shared animated shimmer (not a static
 * flat fill) — see /docs/DESIGN_SYSTEM.md "Loading states". */
export function ListSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-end justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Skeleton className="h-[520px] w-full rounded-xl" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Assessment Report — wide container, 40/60 objective/diagnostic split. */
export function ResultSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6 p-4 md:p-8 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-[340px] w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Try Yourself — the same split-shell shape as the real page, so the
 * teal brand panel is present immediately, not a blank flash. */
export function TryOnboardingSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-background min-[900px]:flex-row">
      <div className="flex shrink-0 items-center justify-center bg-primary px-6 py-8 min-[900px]:flex-1 min-[900px]:py-16">
        <div className="size-10 animate-pulse rounded-[28%] bg-primary-foreground/20 min-[900px]:size-14" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        <Skeleton className="h-2 w-full max-w-sm rounded-full" />
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
