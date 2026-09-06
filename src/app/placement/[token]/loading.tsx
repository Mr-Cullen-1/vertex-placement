import { PlacementShellSkeleton } from "@/components/placement/placement-shell-skeleton";

/**
 * Route-level Suspense fallback for `/placement/[token]`. Before this
 * file existed, this segment had NO loading boundary at all — a client
 * `router.push("/placement/…")` (from Try Yourself's ready/result steps)
 * left the previous screen frozen on-screen for the entire duration of
 * this route's server-side compute (`getPlacementStatus`, several
 * sequential DB round-trips) with no visual feedback, which is the
 * concrete, reproducible root cause behind reports of a route "getting
 * stuck" until a hard refresh. Adding this file lets Next.js show real,
 * immediate pending-state feedback for that navigation instead. See
 * /docs/DESIGN_SYSTEM.md "Loading system: stuck-loading root cause".
 */
export default function Loading() {
  return <PlacementShellSkeleton />;
}
