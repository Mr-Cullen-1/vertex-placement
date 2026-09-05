import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  /** "interactive" adds a hover lift/border for cards that are
   * themselves a click target (e.g. wrapped in a Link) — never applied
   * to a purely informational card. "tinted" is a restrained violet-wash
   * surface for a card that represents a configuration/delivery area
   * (placement bands, invitation lifecycle) rather than plain
   * informational content — still never a flooded purple block. See
   * /docs/DESIGN_SYSTEM.md "Cards". */
  variant?: "default" | "interactive" | "tinted"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-all duration-150 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 data-[variant=interactive]:cursor-pointer data-[variant=interactive]:hover:shadow-md data-[variant=interactive]:hover:ring-primary/25 data-[variant=tinted]:bg-[color-mix(in_oklch,var(--card)_92%,var(--primary)_8%)] data-[variant=tinted]:ring-primary/12 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/**
 * Standardized "icon + title (+ description) + action" card header — the
 * repeated `<CardHeader><CardTitle>X</CardTitle></CardHeader>` pattern
 * now carries a small icon chip and a bottom rule so every section
 * (Test information, Assignments, Candidate, Invitation, Score, …) reads
 * as a labeled product surface rather than a bare bordered box. One
 * shared primitive rather than a per-page treatment, per
 * /docs/DESIGN_SYSTEM.md "Cards".
 */
function CardHeading({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <CardHeader className={cn("flex-row items-center justify-between gap-3 border-b", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </CardHeader>
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardHeading,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
