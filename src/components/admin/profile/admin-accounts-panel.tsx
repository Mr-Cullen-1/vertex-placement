"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, PencilIcon, KeyRoundIcon, UserXIcon, UserCheckIcon, ShieldIcon } from "lucide-react";
import {
  createAdminAction,
  updateAdminAction,
  resetAdminPasswordAction,
  deactivateAdminAction,
  reactivateAdminAction,
} from "@/server/actions/admin-actions";
import type { AdminSummary } from "@/server/services/user.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Super Admin-only account management. The parent page only renders this
 * for a Super Admin actor, but every action here still calls a Server
 * Action that re-checks permission (and, for edit/reset/deactivate, that
 * the target isn't Super Admin) server-side — the UI gate is a
 * convenience, not the security boundary. See /server/services/user.service.ts.
 *
 * Button-only rows, matching InteractiveListItem's convention elsewhere:
 * the card itself is never a link/button, only the explicit trailing
 * actions are.
 */
export function AdminAccountsPanel({ admins }: { admins: AdminSummary[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-section-title text-foreground">Admin accounts</h2>
          <p className="text-sm text-muted-foreground">
            Regular Admins have full day-to-day product access but cannot manage other accounts.
          </p>
        </div>
        <AddAdminDialog />
      </div>

      <div className="flex flex-col gap-2">
        {admins.map((admin) => (
          <AdminAccountRow key={admin.id} admin={admin} />
        ))}
      </div>
    </div>
  );
}

function AdminAccountRow({ admin }: { admin: AdminSummary }) {
  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{admin.name}</span>
          <Badge variant={isSuperAdmin ? "outline" : "secondary"}>
            {isSuperAdmin && <ShieldIcon className="size-3" />}
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </Badge>
          <Badge variant={admin.isActive ? "success" : "destructive"}>
            {admin.isActive ? "Active" : "Deactivated"}
          </Badge>
        </div>
        <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
        <span className="text-xs text-muted-foreground">Created {formatDate(admin.createdAt)}</span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isSuperAdmin ? (
          <span className="text-xs text-muted-foreground italic">Protected account</span>
        ) : (
          <>
            <EditAdminDialog admin={admin} />
            <ResetPasswordDialog admin={admin} />
            {admin.isActive ? (
              <DeactivateAdminDialog admin={admin} />
            ) : (
              <ReactivateAdminButton admin={admin} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AddAdminDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await createAdminAction({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Add admin
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add admin</DialogTitle>
          <DialogDescription>
            Creates a regular Admin account with full operational access. Only a Super Admin can
            create, edit, or remove admin accounts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-admin-name">Full name</Label>
            <Input id="add-admin-name" name="name" required maxLength={200} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-admin-email">Email</Label>
            <Input id="add-admin-email" name="email" type="email" required maxLength={255} autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-admin-password">Temporary password</Label>
            <Input
              id="add-admin-password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-admin-confirmPassword">Confirm password</Label>
            <Input
              id="add-admin-confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({ admin }: { admin: AdminSummary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await updateAdminAction(admin.id, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit admin</DialogTitle>
          <DialogDescription>Name and email only — password changes use Reset password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-name">Full name</Label>
            <Input id="edit-admin-name" name="name" required maxLength={200} defaultValue={admin.name} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-admin-email">Email</Label>
            <Input
              id="edit-admin-email"
              name="email"
              type="email"
              required
              maxLength={255}
              defaultValue={admin.email}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ admin }: { admin: AdminSummary }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await resetAdminPasswordAction(admin.id, {
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDone(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setDone(false);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <KeyRoundIcon />
        Reset password
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Sets a new password for {admin.name} immediately.</DialogDescription>
        </DialogHeader>
        {done ? (
          <>
            <p className="text-sm text-foreground">Password updated.</p>
            <DialogFooter showCloseButton />
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reset-password-${admin.id}`}>New password</Label>
              <Input
                id={`reset-password-${admin.id}`}
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reset-confirm-${admin.id}`}>Confirm new password</Label>
              <Input
                id={`reset-confirm-${admin.id}`}
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating…" : "Reset password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeactivateAdminDialog({ admin }: { admin: AdminSummary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    setPending(true);
    setError(null);
    const result = await deactivateAdminAction(admin.id);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <UserXIcon />
        Remove
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove {admin.name}?</DialogTitle>
          <DialogDescription>
            Deactivates the account — its sign-in stops working immediately, including any
            already-open session, and existing assignments/invitations it created keep their
            history. It can be reactivated later from this same list.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter showCloseButton>
          <Button variant="destructive" onClick={handleDeactivate} disabled={pending}>
            {pending ? "Removing…" : "Remove admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReactivateAdminButton({ admin }: { admin: AdminSummary }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReactivate() {
    setPending(true);
    setError(null);
    const result = await reactivateAdminAction(admin.id);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-1", error && "items-end")}>
      <Button variant="outline" size="sm" onClick={handleReactivate} disabled={pending}>
        <UserCheckIcon />
        {pending ? "Reactivating…" : "Reactivate"}
      </Button>
      {error && <p className="max-w-xs text-xs text-destructive">{error}</p>}
    </div>
  );
}
