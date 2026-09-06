import { cn } from "@/lib/utils";
import { VertexMark } from "./vertex-mark";

const SIZES = {
  sm: { ring: "size-14", mark: "size-8" },
  md: { ring: "size-20", mark: "size-12" },
  lg: { ring: "size-28", mark: "size-16" },
} as const;

interface VertexLoaderProps {
  size?: keyof typeof SIZES;
  /** sr-only status text — this is the only user-facing indication for
   * assistive tech that work is happening; the motion itself is purely
   * decorative. */
  label?: string;
  className?: string;
}

/**
 * The Vertex loading identity (Student Assessment loading system) — the
 * mark stays stationary at the center while two thin teal/neutral rings
 * orbit around it at different speeds and directions, continuously and
 * without a pause between loops. Deliberately not a generic spinner,
 * bouncing dots, or a glowing orb (see /docs/DESIGN_SYSTEM.md "Loading
 * system"). Purely visual feedback — callers control when it mounts and
 * unmounts based on real pending state; this component never decides how
 * long it stays visible (no internal timers, no fake completion).
 * `prefers-reduced-motion` freezes both rings in place via the global
 * `.animate-orbit(-reverse)` override in globals.css.
 */
export function VertexLoader({ size = "md", label = "Loading", className }: VertexLoaderProps) {
  const { ring, mark } = SIZES[size];
  return (
    <div
      role="status"
      className={cn("relative inline-flex shrink-0 animate-loader-reveal items-center justify-center", ring, className)}
    >
      {/* `stroke="currentColor"` plus an inline `color` style, not a raw
       * `stroke="var(--primary)"` attribute or a Tailwind text-color
       * utility — SVG presentation attributes don't reliably resolve CSS
       * custom properties, and a `style` prop is the one reliably
       * cascade-independent way to set `currentColor`'s source here. */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ color: "var(--primary)" }}
        className="absolute inset-0 size-full animate-orbit"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="66 264"
        />
      </svg>
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ color: "var(--muted-icon)" }}
        className="absolute inset-0 size-full animate-orbit-reverse"
      >
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="30 207"
        />
      </svg>
      <VertexMark className={cn("relative z-10", mark)} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
