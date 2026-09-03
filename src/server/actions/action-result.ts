import { DomainError } from "@/server/errors";

/**
 * Server Actions serialize thrown errors back to the client as plain
 * `Error` objects — the `DomainError` subclass identity (and its `code`)
 * is lost across that boundary, leaving only `.message` to branch on,
 * which is fragile. Every student-facing action instead returns this
 * discriminated result, so client components can switch on a stable
 * `code` string. Non-`DomainError` failures (a real bug, a network blip
 * inside the action, etc.) are logged server-side and collapsed to a
 * generic code — never leaking a raw Prisma/Postgres message to the
 * student (see /docs/PHASE_2A.md "Security").
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof DomainError) {
      return { ok: false, code: error.code, message: error.message };
    }
    console.error("Unexpected error in student-facing action:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our end. Please try again.",
    };
  }
}
