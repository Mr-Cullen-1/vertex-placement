import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

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

export { Select }
