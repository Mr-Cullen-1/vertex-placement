import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { DuplicateEmailError, SuperAdminProtectedError, UserNotFoundError } from "@/server/errors";
import { normalizeEmail } from "@/domain/self-serve/email";
import {
  createAdminSchema,
  updateAdminSchema,
  resetAdminPasswordSchema,
  type CreateAdminInput,
  type UpdateAdminInput,
  type ResetAdminPasswordInput,
} from "@/domain/admin/schema";

/**
 * Admin account management (Super Admin only — see rbac.ts
 * "admin:manage"). Every function here starts with `assertPermission`
 * AND, for anything that targets an existing account, a check that the
 * target isn't SUPER_ADMIN — the second check is what makes Super Admin
 * protected against a mistake by the (only) role that could otherwise
 * reach these functions, not just against a regular Admin (who can never
 * reach them at all). See /docs/PRODUCT_RULES.md "Roles".
 *
 * Never selects `passwordHash` — every query below has an explicit
 * `select` that omits it, so a hash can never leave this layer even by
 * accident (see /docs/PHASE_1.md "Security").
 */

const ADMIN_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export interface AdminSummary {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
  isActive: boolean;
  createdAt: Date;
}

/** Every account (Admin and Super Admin) — the Super Admin row is
 * included so the UI can render it as visibly present-but-protected,
 * never omitted as if it didn't exist (see /docs/PRODUCT_RULES.md
 * "Roles" — "If Super Admin appears in the account list, show it as
 * read-only/protected"). */
export async function listAdmins(actor: Actor): Promise<AdminSummary[]> {
  assertPermission(actor, "admin:manage");
  return db.user.findMany({ select: ADMIN_SUMMARY_SELECT, orderBy: { createdAt: "asc" } });
}

export async function createAdmin(actor: Actor, input: CreateAdminInput): Promise<AdminSummary> {
  assertPermission(actor, "admin:manage");
  const data = createAdminSchema.parse(input);
  const email = normalizeEmail(data.email);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new DuplicateEmailError();

  const passwordHash = await bcrypt.hash(data.password, 12);
  // Role is never taken from the caller's input — always ADMIN. There is
  // no code path anywhere in this service that can create or promote a
  // user to SUPER_ADMIN; that role is seed-only (see prisma/seed.ts).
  return db.user.create({
    data: { name: data.name, email, passwordHash, role: "ADMIN" },
    select: ADMIN_SUMMARY_SELECT,
  });
}

async function requireEditableAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new UserNotFoundError();
  if (user.role === "SUPER_ADMIN") throw new SuperAdminProtectedError();
  return user;
}

export async function updateAdmin(
  actor: Actor,
  userId: string,
  input: UpdateAdminInput
): Promise<AdminSummary> {
  assertPermission(actor, "admin:manage");
  await requireEditableAdmin(userId);
  const data = updateAdminSchema.parse(input);
  const email = normalizeEmail(data.email);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) throw new DuplicateEmailError();

  return db.user.update({
    where: { id: userId },
    data: { name: data.name, email },
    select: ADMIN_SUMMARY_SELECT,
  });
}

export async function resetAdminPassword(
  actor: Actor,
  userId: string,
  input: ResetAdminPasswordInput
): Promise<void> {
  assertPermission(actor, "admin:manage");
  await requireEditableAdmin(userId);
  const data = resetAdminPasswordSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
}

/** "Remove admin" in the UI — internally a deactivation (`isActive =
 * false`), never a hard delete. A regular Admin can have created
 * PlacementAssignment/PlacementInvitation rows and set Final Placement
 * overrides (all `createdByUserId`/`finalPlacementSetByUserId`, nullable
 * FKs to User) — hard-deleting the row would silently null out that
 * attribution and lose real audit history. Deactivation preserves every
 * FK and every attribution while fully revoking access: `auth.ts`'s `jwt`
 * callback re-checks `isActive` from the database on every request, so a
 * deactivated admin's existing session is rejected at the next
 * authorization check, not just blocked from a future login. See
 * /docs/PRODUCT_RULES.md "Roles" and src/lib/auth.ts. */
export async function deactivateAdmin(actor: Actor, userId: string): Promise<AdminSummary> {
  assertPermission(actor, "admin:manage");
  await requireEditableAdmin(userId);
  return db.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: ADMIN_SUMMARY_SELECT,
  });
}

export async function reactivateAdmin(actor: Actor, userId: string): Promise<AdminSummary> {
  assertPermission(actor, "admin:manage");
  await requireEditableAdmin(userId);
  return db.user.update({
    where: { id: userId },
    data: { isActive: true },
    select: ADMIN_SUMMARY_SELECT,
  });
}

// --- Auth support ------------------------------------------------------
//
// Extracted out of src/lib/auth.ts so the two security-critical checks
// NextAuth relies on (credential verification at sign-in, and per-request
// session-liveness re-validation) are plain, directly testable functions
// like every other service in this file — not logic buried inside a
// framework callback with no test harness of its own. Behavior is
// unchanged from what previously lived inline in the `authorize`/`jwt`
// callbacks.

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPER_ADMIN";
}

/** Used by the Credentials provider's `authorize` callback. Returns null
 * (never throws) for any invalid email/password OR a deactivated
 * account — an inactive user must not be able to start a new session,
 * exactly as if the password were wrong. */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Used by the `jwt` callback on every request after the initial sign-in
 * to re-check that the account is still active — a deactivated admin's
 * already-issued JWT must stop working immediately, not just block a
 * future login. Returns null if the user no longer exists or is
 * inactive. */
export async function isUserSessionActive(
  userId: string
): Promise<{ role: "ADMIN" | "SUPER_ADMIN" } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { role: user.role };
}
