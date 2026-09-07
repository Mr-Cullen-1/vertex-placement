import * as React from "react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"

/** A plain native <select>, styled to match Input/Button — not the
 * base-ui Select primitive. The admin forms that need a picker (test,
 * candidate) have small option counts where a native select is simplest
 * and fully accessible; not worth the extra popup/portal machinery a
 * custom listbox would add for this phase. */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-3 pr-7 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  items: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  id?: string
  "aria-label"?: string
  disabled?: boolean
  className?: string
}

/**
 * A custom-rendered Select — replaces a native `<select>` where its
 * options can be long/varied (e.g. test titles): the browser's own
 * dropdown sizes itself to the widest option and can extend outside a
 * modal, and its selected/hover rows can't be restyled at all. Built on
 * `@base-ui/react/select` (same headless library as `Dialog`), so the
 * popup is a real positioned/portaled element that never exceeds the
 * trigger's own width, never exceeds the viewport, and is fully
 * restyled — no native browser-blue selection. See
 * /docs/DESIGN_SYSTEM.md "Combobox".
 */
function Combobox({
  items,
  value,
  onValueChange,
  placeholder = "Select…",
  id,
  "aria-label": ariaLabel,
  disabled,
  className,
}: ComboboxProps) {
  return (
    <SelectPrimitive.Root
      items={items.map((item) => ({ value: item.value, label: item.label }))}
      value={value || null}
      onValueChange={(next) => onValueChange((next as string | null) ?? "")}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      >
        <SelectPrimitive.Value className="min-w-0 flex-1 truncate text-left" title={items.find((i) => i.value === value)?.label}>
          {(v: string | null) => items.find((i) => i.value === v)?.label ?? placeholder}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDownIcon className="size-3.5" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          align="start"
          alignItemWithTrigger={false}
          className="z-50 w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] outline-none"
        >
          <SelectPrimitive.Popup className="max-h-72 w-full overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-popover p-1 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
            {items.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">No options available.</p>
            ) : (
              items.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  className="relative flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg py-2 pr-2.5 pl-2.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium"
                >
                  <SelectPrimitive.ItemText className="min-w-0 flex-1 text-pretty break-words line-clamp-2">
                    {item.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="flex shrink-0 items-center text-primary">
                    <CheckIcon className="size-3.5" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { Select, Combobox }
