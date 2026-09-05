import { db } from "@/lib/db";
import { RateLimitedError } from "@/server/errors";

/**
 * Generic DB-backed sliding-window rate limiter shared by every public
 * self-service endpoint (see /docs/PHASE_2J_TRY_YOURSELF.md
 * "Rate limiting"). Deliberately not a new Redis/Upstash dependency —
 * Postgres is already the system's one source of truth and MVP volume
 * doesn't justify new infrastructure. `bucket` is the caller-composed
 * identifier, e.g. `verify-request:email:a@b.com` or
 * `verify-request:ip:203.0.113.4` — callers combine an action name with
 * an identifier so different actions never share a window.
 */

/** Records one event in `bucket` and throws `RateLimitedError` if doing
 * so pushes the count within `windowMs` over `limit`. Insert-then-count
 * (not count-then-insert) so two concurrent requests both get recorded
 * and both see a consistent count — a request is never silently
 * "free" just because it raced another. */
export async function recordAndEnforce(
  bucket: string,
  windowMs: number,
  limit: number
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  await db.rateLimitEvent.create({ data: { bucket } });

  const count = await db.rateLimitEvent.count({
    where: { bucket, createdAt: { gte: windowStart } },
  });

  if (count > limit) {
    throw new RateLimitedError();
  }

  // Opportunistic cleanup — keeps the table from growing unbounded
  // without a scheduled job. Cheap: indexed on (bucket, createdAt), and
  // only runs on the request that just recorded an event for this
  // bucket, so it's naturally rate-limited by real traffic itself.
  await db.rateLimitEvent.deleteMany({
    where: { bucket, createdAt: { lt: windowStart } },
  });
}

/** Best-effort client IP for the IP-scoped bucket half of the public
 * endpoints' protection. Depends entirely on the deployment's
 * reverse-proxy setting `x-forwarded-for` — if absent (e.g. plain local
 * dev with no proxy in front), IP-based limiting is simply skipped and
 * only the email-scoped bucket applies. See
 * /docs/PHASE_2J_TRY_YOURSELF.md "Known limitations". */
export function extractClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  const first = forwardedFor.split(",")[0]?.trim();
  return first || null;
}
