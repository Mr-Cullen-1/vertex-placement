"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, RefreshCwIcon, XIcon } from "lucide-react";
import {
  generateInvitationAction,
  regenerateInvitationAction,
  revokeInvitationAction,
} from "@/server/actions/invitation-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InvitationStatusBadge } from "@/components/admin/status-badge";
import { formatDateTime } from "@/lib/format";

export interface InvitationSummary {
  id: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";
  createdAt: string;
  usedAt: string | null;
}

/**
 * Generates/regenerates/revokes the student invitation link. The
 * plaintext token exists ONLY in this component's local state, right
 * after a successful generate/regenerate call — it is never persisted
 * (see invitation.service.ts) and this panel never receives a
 * `tokenHash` prop; there is nothing sensitive to leak even in the
 * server-rendered history list below. See /docs/PHASE_2B.md "Invitation
 * management".
 */
export function InvitationPanel({
  assignmentId,
  history,
  assignmentCompleted,
}: {
  assignmentId: string;
  history: InvitationSummary[];
  /** Once an assignment is COMPLETED, issuing a new invitation would
   * start a second attempt against it — a retake path this phase
   * doesn't build or support (see /docs/PHASE_2B.md "Known
   * limitations"). The button is hidden rather than left to fail
   * server-side, since nothing here actually blocks it today. */
  assignmentCompleted: boolean;
}) {
  const router = useRouter();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const active = history.find((i) => i.status === "ACTIVE") ?? null;
  const studentUrl =
    revealedToken && typeof window !== "undefined"
      ? `${window.location.origin}/placement/${revealedToken}`
      : null;

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await generateInvitationAction(assignmentId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRevealedToken(result.data.plaintextToken);
    router.refresh();
  }

  async function handleRegenerate() {
    setPending(true);
    setError(null);
    const result = await regenerateInvitationAction(assignmentId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRevealedToken(result.data.plaintextToken);
    router.refresh();
  }

  async function handleRevoke() {
    if (!active) return;
    setPending(true);
    setError(null);
    const result = await revokeInvitationAction(active.id);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRevealedToken(null);
    router.refresh();
  }

  async function copyLink() {
    if (!studentUrl) return;
    try {
      await navigator.clipboard.writeText(studentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure
      // context) — the link is still visible/selectable in the box.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {studentUrl && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-accent px-4 py-3">
          <p className="text-xs font-medium text-accent-foreground">
            Shown once — copy it now. It cannot be retrieved again after you leave this page.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-background px-2.5 py-1.5 text-xs whitespace-nowrap text-foreground">
              {studentUrl}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {active ? (
          <>
            <span className="text-sm text-muted-foreground">
              An active invitation link exists (hidden for security).
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={pending}>
                <RefreshCwIcon />
                Regenerate
              </Button>
              <RevokeInvitationDialog onConfirm={handleRevoke} pending={pending} />
            </div>
          </>
        ) : assignmentCompleted ? (
          <span className="text-sm text-muted-foreground">
            This assignment is complete — a new invitation isn&apos;t offered here.
          </span>
        ) : (
          <Button size="sm" onClick={handleGenerate} disabled={pending}>
            {pending ? "Generating…" : "Generate invitation"}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {history.length > 0 && (
        <ul className="flex flex-col divide-y divide-border text-sm">
          {history.map((invitation) => (
            <li key={invitation.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <InvitationStatusBadge status={invitation.status} />
              <span className="text-xs text-muted-foreground">
                Created {formatDateTime(invitation.createdAt)}
                {invitation.usedAt ? ` · Used ${formatDateTime(invitation.usedAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RevokeInvitationDialog({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>
        <XIcon />
        Revoke
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Revoke this invitation?</DialogTitle>
          <DialogDescription>
            The current link will stop working immediately. You can generate a new one afterwards.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {pending ? "Revoking…" : "Revoke invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
