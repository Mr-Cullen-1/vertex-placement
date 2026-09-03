"use client";

import { Button } from "@/components/ui/button";

/** Catches unexpected errors from any nested `/admin/*` route (a real
 * bug, an un-mapped exception) — expected domain failures are handled
 * per-page via try/catch + notFound()/inline messages, not here. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred while loading this page."}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
