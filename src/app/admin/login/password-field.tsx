"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Show/hide affordance for the login password field — purely a local
 * UI toggle (input `type` swap), no change to how the value is
 * submitted or validated. Kept local to the login route rather than a
 * new `ui/` primitive since this is the only password field in the
 * product today. */
export function PasswordField({ id, name, className }: { id: string; name: string; className?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <LockIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-sidebar-foreground/40" />
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete="current-password"
        className={cn(
          "h-[52px] rounded-xl border-white/10 bg-white/5 pr-11 pl-11 text-base text-white placeholder:text-sidebar-foreground/35",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 text-sidebar-foreground/45 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
