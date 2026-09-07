import type { UserRole } from "@prisma/client";
import { ForbiddenError } from "@/server/errors";

/**
 * Centralized permission checks — the permission matrix lives in exactly
 * one place so a new route/action can't accidentally bypass it. See
 * /docs/PRODUCT_RULES.md ("Roles") for the source business rules.
 *
 * Every mutating (and most reading) service function should call
 * `assertPermission(actor, "...")` as its first line, before touching the
 * database. Services accept an explicit `Actor` parameter rather than
 * reading the session themselves — this keeps `src/server/**` testable
 * without a Next.js request context and keeps `src/domain/**` free of
 * both Next.js and Prisma imports (Prisma-touching code lives in
 * `src/server/services/**`, one layer up from pure domain logic).
 */
export interface Actor {
  userId: string;
  role: UserRole;
}

export type Permission =
  // PlacementTest / Question / Option / Metadata / Import — normal
  // product/content administration, Admin and Super Admin (Correction
  // pass: previously Super-Admin-only; see /docs/PRODUCT_RULES.md
  // "Roles" for why that was corrected). `test:write` also gates
  // designating/clearing the public self-service test — see
  // `setPublicSelfServiceTest`/`clearPublicSelfServiceTest` in
  // placement-test.service.ts — since that's ordinary test
  // administration, not account/role administration.
  | "test:read"
  | "test:write"
  | "question:write"
  | "band:write"
  | "import:write"
  // Assignment / Invitation — Admin and Super Admin
  | "assignment:write"
  | "invitation:write"
  // Candidates / Results — Admin and Super Admin
  | "candidate:read"
  | "result:read"
  // Phase 2L: Final Placement override — an administrative decision,
  // distinct from `result:read`. Both roles may set it (see
  // /docs/PHASE_2L_SCORING_POLICY.md "Final Placement").
  | "result:write"
  | "analytics:read:standard"
  | "export:standard"
  // Genuine remaining content-depth distinction, NOT part of this
  // correction pass — the extra "Question Analysis" export sheet stays
  // Super-Admin-only (see export.service.ts); nothing in the corrected
  // role model asked for this one to change.
  | "analytics:read:full"
  | "export:full"
  // Admin account management (list/create/edit/reset-password/deactivate
  // regular Admin accounts) — Super Admin only. See /docs/PRODUCT_RULES.md
  // "Roles": SUPER_ADMIN = ADMIN + admin account management + role/
  // account authority + Super Admin protection authority. SUPER_ADMIN is
  // NOT a "content administrator" — it has no product-content privilege
  // ADMIN lacks; this is the one and only thing that distinguishes it.
  | "admin:manage";

const ADMIN_PERMISSIONS: readonly Permission[] = [
  "test:read",
  "test:write",
  "question:write",
  "band:write",
  "import:write",
  "assignment:write",
  "invitation:write",
  "candidate:read",
  "result:read",
  "result:write",
  "analytics:read:standard",
  "export:standard",
];

const SUPER_ADMIN_PERMISSIONS: readonly Permission[] = [
  ...ADMIN_PERMISSIONS,
  "analytics:read:full",
  "export:full",
  "admin:manage",
];

const PERMISSIONS_BY_ROLE: Record<UserRole, readonly Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS_BY_ROLE[role].includes(permission);
}

/** Throws ForbiddenError if the actor's role lacks the permission.
 * Callers that also need to distinguish "not authenticated at all" should
 * use `getActorOrThrow` (src/lib/actor.ts) to obtain the Actor first. */
export function assertPermission(actor: Actor, permission: Permission): void {
  if (!hasPermission(actor.role, permission)) {
    throw new ForbiddenError(
      `Role ${actor.role} does not have permission "${permission}".`
    );
  }
}
