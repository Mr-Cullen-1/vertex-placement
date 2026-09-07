import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { VertexLoader } from "@/components/placement/vertex-loader";

/** Skeletons approximate the real page's layout (header + interactive
 * list/cards) so there's minimal content shift once data arrives, and
 * the app canvas renders immediately instead of a blank flash. Every
 * skeleton uses `Skeleton`'s shared animated shimmer (not a static
 * flat fill) — see /docs/DESIGN_SYSTEM.md "Loading states".
 *
 * Manual QA correction pass: every skeleton is now wrapped in
 * `AdminLoadingFrame`, which adds the same centered `VertexLoader` focal
 * indicator already approved for Student loading (reused as-is, not
 * redesigned). The overlay is a Fragment SIBLING of the skeleton
 * content — both direct children of `AdminShell`'s `<main>` — rather
 * than nested inside a wrapper around the content. `<main>` itself is
 * `relative` with a fixed flexbox-resolved height that never grows with
 * content (it scrolls internally instead — see its own comment), so the
 * overlay's `absolute inset-0` anchors to THAT fixed box. Nesting the
 * overlay inside a content-sized wrapper instead (the first version of
 * this fix) centered it on the skeleton's own stacked height, which is
 * only equal to the real viewport when content happens to fit — a
 * two-column skeleton (e.g. `ResultSkeleton`) collapsing to one column
 * below `lg` stacks taller than the viewport, and the loader dropped
 * below the fold instead of staying centered on it. See
 * /docs/DESIGN_SYSTEM.md "Loading system". */
function AdminLoadingFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <>
      {children}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <VertexLoader size="lg" label={label} />
      </div>
    </>
  );
}

export function ListSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <AdminLoadingFrame label={label}>
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
    </AdminLoadingFrame>
  );
}

export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <AdminLoadingFrame label={label}>
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
    </AdminLoadingFrame>
  );
}

export function DashboardSkeleton() {
  return (
    <AdminLoadingFrame label="Loading dashboard">
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
    </AdminLoadingFrame>
  );
}

/** Assessment Report — wide container, 40/60 objective/diagnostic split. */
export function ResultSkeleton() {
  return (
    <AdminLoadingFrame label="Loading result">
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
    </AdminLoadingFrame>
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
