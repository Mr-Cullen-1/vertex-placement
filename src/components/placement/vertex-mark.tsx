import Image from "next/image";

/** The real Vertex mark (design/logo.png, copied to public/vertex-logo.png
 * as a static asset — not an inline recreation). The source file is a
 * solid black square with no alpha channel, so it's presented as a
 * small rounded app-icon-style badge rather than composited directly
 * onto the page background. Size is controlled entirely by `className`
 * (e.g. `size-8`) via `fill`, so one component works both as a small
 * inline mark next to text and as a larger standalone icon. */
export function VertexMark({ className }: { className?: string }) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-[28%] ${className ?? ""}`}
    >
      <Image
        src="/vertex-logo.png"
        alt=""
        fill
        sizes="64px"
        className="object-cover"
        priority
      />
    </span>
  );
}

export function VertexWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <VertexMark className="size-6" />
      <span className="text-base font-semibold tracking-tight text-foreground">
        Vertex Placement
      </span>
    </div>
  );
}
