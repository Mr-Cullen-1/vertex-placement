import { VertexWordmark } from "./vertex-mark";

export function PlacementLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="vertex-atmosphere flex h-dvh flex-col items-center justify-center gap-6 overflow-y-auto px-4 text-center">
      <VertexWordmark />
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 text-muted-foreground"
      >
        <span
          aria-hidden="true"
          className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
        />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}
