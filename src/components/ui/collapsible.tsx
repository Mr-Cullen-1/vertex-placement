"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

import { cn } from "@/lib/utils"

/** Accessible expand/collapse section built on base-ui's Collapsible —
 * `CollapsibleTrigger` gets `aria-expanded`/keyboard handling for free,
 * and `CollapsiblePanel` animates via its own measured
 * `--collapsible-panel-height` CSS variable (no JS height measurement, no
 * layout jump, no external animation library — see
 * /docs/DESIGN_SYSTEM.md "Detailed analysis (Phase 2L)"). */
function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  )
}

function CollapsiblePanel({ className, style, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-panel"
      // Height set via a plain inline style, not a Tailwind arbitrary
      // height utility class — an earlier version of this file wrote the
      // CSS-custom-property reference as a bracketed height utility
      // string, which broke the whole build: Tailwind's content scanner
      // treats bracketed utility-shaped text anywhere in this file
      // (even inside a comment describing it) as a literal class
      // candidate and tries to generate CSS for it. Inline style avoids
      // that scanning entirely, with the same animation behavior.
      style={{ height: "var(--collapsible-panel-height)", ...style }}
      className={cn(
        "overflow-hidden transition-[height] duration-200 ease-out data-starting-style:h-0! data-ending-style:h-0!",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsiblePanel }
