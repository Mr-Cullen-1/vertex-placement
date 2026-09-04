"use client";

import { ServerCrashIcon } from "lucide-react";
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ServerCrashIcon className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
