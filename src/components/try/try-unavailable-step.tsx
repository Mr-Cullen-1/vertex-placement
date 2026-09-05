import { AlertTriangleIcon, ServerCrashIcon } from "lucide-react";
import { VertexWordmark } from "@/components/placement/vertex-mark";

/** Controlled unavailable states — no public test configured, a
 * configured test archived, or a generic server error (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Public test failure states"). Never a
 * crash into a generic 500 page. */
export function TryUnavailableStep({ code }: { code?: string }) {
  const isServerError = code === "SERVER_ERROR";
  const Icon = isServerError ? ServerCrashIcon : AlertTriangleIcon;

  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 text-center">
      <VertexWordmark />
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-lg font-semibold text-foreground">
          {isServerError ? "Something went wrong" : "Self-service placement isn't available right now"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isServerError
            ? "Please refresh the page and try again."
            : "Please check back later, or contact your education center for an invitation."}
        </p>
      </div>
    </div>
  );
}
