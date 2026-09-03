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
  // PlacementTest / Question / Option / Metadata — Super Admin only
  | "test:read"
  | "test:write"
  | "question:write"
  | "band:write"
  // Assignment / Invitation — Admin and Super Admin
  | "assignment:write"
  | "invitation:write"
  // Candidates / Results — Admin and Super Admin
  | "candidate:read"
  | "result:read"
  | "analytics:read:standard"
  | "export:standard"
  // Super Admin only
  | "analytics:read:full"
  | "export:full"
  | "import:write";

const ADMIN_PERMISSIONS: readonly Permission[] = [
  "test:read",
  "assignment:write",
  "invitation:write",
  "candidate:read",
  "result:read",
  "analytics:read:standard",
  "export:standard",
];

const SUPER_ADMIN_PERMISSIONS: readonly Permission[] = [
  ...ADMIN_PERMISSIONS,
  "test:write",
  "question:write",
  "band:write",
  "analytics:read:full",
  "export:full",
  "import:write",
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
