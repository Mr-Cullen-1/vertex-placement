/** Inline recreation of the Vertex chevron mark in brand color — see
 * design/logo.png and DESIGN_REFERENCE.png. Kept as inline SVG (not an
 * imported raster asset) since the source logo is a white mark on a
 * solid black square, not directly usable on a light surface. */
export function VertexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 6h6l7 14 7-14h6L16 28 3 6Z"
        fill="currentColor"
      />
      <path d="M12.5 15 16 21.5 19.5 15h-2.6L16 17l-.9-2h-2.6Z" fill="var(--background)" />
    </svg>
  );
}

export function VertexWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <VertexMark className="h-6 w-6 text-primary" />
      <span className="text-base font-semibold tracking-tight text-foreground">
        Vertex Placement
      </span>
    </div>
  );
}
