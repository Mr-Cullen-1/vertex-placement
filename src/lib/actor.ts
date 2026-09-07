import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/server/errors";
import type { Actor } from "@/server/rbac";
import { isUserSessionActive } from "@/server/services/user.service";

/** Bridges a Next.js request-scoped session into the plain `Actor` object
 * the service layer expects. Lives in `src/lib` (not `src/server`) since
 * it's the one place allowed to call `auth()` — everything past this
 * point takes an explicit Actor and has no framework dependency.
 *
 * Also where a deactivated/removed admin's already-issued JWT is
 * rejected — re-checked here (every service-layer entry point resolves
 * its Actor through this function) rather than inside `auth.ts`'s `jwt`
 * callback. The callback runs on EVERY request that reaches `auth()`,
 * including every `proxy.ts` invocation for Next.js Link's viewport/
 * hover prefetches — adding a DB round-trip there made ordinary sidebar
 * navigation visibly flaky (prefetch and click requests contending for
 * the same real, pooled Postgres connection). `proxy.ts` never checked
 * role/isActive anyway — it only gates "is there a session at all" — so
 * the actual enforcement point for "is this specific account still
 * allowed to act" belongs here, once per real page render or Server
 * Action call, not once per prefetch. See /docs/PRODUCT_RULES.md
 * "Roles" and the Admin layout's matching check for the shell-level
 * (not just data-fetch-level) experience. */
export async function getActorOrThrow(): Promise<Actor> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  const current = await isUserSessionActive(session.user.id);
  if (!current) {
    throw new UnauthorizedError();
  }
  return { userId: session.user.id, role: current.role };
}
