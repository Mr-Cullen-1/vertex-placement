"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  setPublicSelfServiceTestAction,
  clearPublicSelfServiceTestAction,
} from "@/server/actions/test-actions";

/**
 * Gated by `test:write` (Admin + Super Admin — ordinary test
 * administration, not account/role management) — designates which
 * PUBLISHED test `/try` launches (see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Public test selection"). Only one
 * test in the whole system can be public at a time; the server enforces
 * this (a partial unique index, not just this UI), so toggling one test
 * on implicitly toggles any other off.
 */
export function PublicSelfServiceToggle({
  testId,
  status,
  isPublic,
}: {
  testId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPublic: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "PUBLISHED" && !isPublic) return null;

  async function handleToggle() {
    setPending(true);
    setError(null);
    const result = isPublic
      ? await clearPublicSelfServiceTestAction(testId)
      : await setPublicSelfServiceTestAction(testId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {isPublic && (
          <Badge variant="info">
            <GlobeIcon />
            Try Yourself
          </Badge>
        )}
        <Button
          variant={isPublic ? "outline" : "secondary"}
          size="sm"
          onClick={handleToggle}
          disabled={pending || status !== "PUBLISHED"}
        >
          {pending ? "Saving…" : isPublic ? "Remove from Try Yourself" : "Use as Try Yourself test"}
        </Button>
      </div>
      {error && <p className="max-w-xs text-xs text-destructive">{error}</p>}
    </div>
  );
}
