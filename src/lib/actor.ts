import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/server/errors";
import type { Actor } from "@/server/rbac";

/** Bridges a Next.js request-scoped session into the plain `Actor` object
 * the service layer expects. Lives in `src/lib` (not `src/server`) since
 * it's the one place allowed to call `auth()` — everything past this
 * point takes an explicit Actor and has no framework dependency. */
export async function getActorOrThrow(): Promise<Actor> {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return { userId: session.user.id, role: session.user.role };
}
