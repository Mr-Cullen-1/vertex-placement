# Phase 2J — Public self-service ("Try Yourself")

The third and final Phase 2J deliverable, built after the P0 scoring-semantics
fix and the candidate-ownership fix (both already shipped — see
[PRODUCT_RULES.md](./PRODUCT_RULES.md)). Adds a public, unauthenticated entry
path into the *same* assessment domain — no second test engine, scoring
system, or candidate architecture.

## Architecture decisions

Audited before writing any code: current auth (Auth.js, Admin/Super-Admin
only, JWT session strategy, no OAuth), `Candidate`/`Assignment`/`Invitation`/
`Attempt` models, no existing email provider, no rate-limiting infrastructure,
no public-facing contact configuration. Conclusion: the minimum necessary
addition is (1) a lightweight, *separate* verified-email session (not
Auth.js — a public visitor has no password and no `User` row), (2) a public
counterpart to assignment/invitation creation that skips RBAC entirely rather
than faking an actor, and (3) new, small, additive schema for identity,
verification codes, and rate limiting. No new npm dependency was added.

## Schema changes

All additive; see `prisma/migrations/20260906010000_public_self_service/`.

- `PlacementTest.isPublicSelfService Boolean @default(false)`, with a partial
  unique index (`WHERE "isPublicSelfService" = true`) enforcing "at most one
  public test" at the database level.
- `PlacementAssignment.origin` (`ADMIN | SELF_SERVICE`, default `ADMIN`) — the
  admin-visibility origin indicator, and the scope for the quota rules below.
- `PlacementAssignment.createdByUserId` and `PlacementInvitation.createdByUserId`
  relaxed from `NOT NULL` to nullable — a `SELF_SERVICE` row has no admin actor
  to attribute it to. Every historical (`ADMIN`-origin) row already has a
  value; nothing was backfilled or rewritten.
- A partial unique index on `PlacementAssignment (candidateId) WHERE
  origin='SELF_SERVICE' AND status IN ('PENDING','IN_PROGRESS')` — "at most one
  active self-service assignment per candidate," enforced at the database
  level (see "Concurrency protection" below).
- `PublicIdentity` (new table) — the 1:1, permanent map from a verified
  normalized email to the one `Candidate` that owns it.
- `PublicVerificationCode` (new table) — one-time email verification codes,
  hashed (never plaintext), with an expiry and an attempt counter.
- `RateLimitEvent` (new table) — a generic sliding-window abuse ledger shared
  by every public endpoint.

No existing column's meaning was overloaded, and no destructive/backfilling
migration was required.

## Email provider/mechanism

`src/server/email/` is the one boundary — `self-serve.service.ts` never
imports a provider SDK/URL directly. **Resend**, reached via a plain `fetch`
call (no new npm dependency), when `RESEND_API_KEY` is configured; otherwise a
console-only dev fallback that logs the code to the **server** console and
refuses to run at all when `NODE_ENV=production` (so it can never become the
effective provider in a misconfigured deployment). Automated tests inject a
capturing fake provider via `__setEmailServiceForTesting` (test-only, also
refuses to run in production) — no test ever sends a real email.

## Verification security

6-digit code, generated with `crypto.randomInt` (CSPRNG). Only its SHA-256
hash is persisted (`domain/self-serve/code.ts`, mirroring the existing
invitation-token model in `domain/tokens/token.ts`). 10-minute expiry, 60s
resend cooldown, 5 max verification attempts per issued code, single-use
(`consumedAt` set on success — replay is rejected). No "does this email
exist" branch exists anywhere, so there is nothing to leak by timing or
response shape.

## Public test selection

Exactly one `PlacementTest.isPublicSelfService` flag, settable only by a
Super Admin from the Test Detail page (only while the test is `PUBLISHED`),
enforced to be unique both by an application-level transaction and a partial
unique index. `getPublicSelfServiceTest()` additionally filters on
`status: PUBLISHED`, so a test archived after being marked public is
automatically treated as "no public test configured" (a controlled
unavailable state) rather than requiring every archive path to remember to
clear the flag.

## Candidate identity/reuse rule

A verified email always resolves to exactly one `Candidate`, via the
dedicated `PublicIdentity` table (never `Candidate.email`, which is
admin-entered and may legitimately collide with a self-service visitor's
address). First verification creates a pending placeholder candidate
(`profileCompletedAt: null`, reusing the exact convention the candidate-
ownership fix established); every subsequent visit resolves the same row.
**An admin-created `Candidate` that happens to share the same email string is
never merged** — `PublicIdentity` has its own FK, so admin data is
structurally untouched by this feature.

## Quota implementation

Two free **completed** attempts per verified identity — `countCompletedSelf-
ServiceAssignments` counts `PlacementAssignment` rows with `origin:
SELF_SERVICE, status: COMPLETED` for that candidate. Opening the test,
refreshing, or resuming never increments it; only a successful `submitAttempt`
does (the existing, unmodified finalization pipeline).

## Concurrency protection

The partial unique index on `(candidateId) WHERE origin=SELF_SERVICE AND
status IN (PENDING, IN_PROGRESS)` is the actual guarantee — not just a
check-then-create race in application code. A losing concurrent request
catches the constraint violation and either recovers (issues a fresh
invitation for a same-request PENDING assignment — safe only because no
attempt exists yet) or is told to re-check eligibility (an assignment that's
already `IN_PROGRESS` under a token the loser holds no plaintext for).

## Routes/UI added

- `/try` — the one public route (`src/app/try/page.tsx` +
  `src/components/try/*`), one-route/client-managed-phases, mirroring
  `PlacementFlow`'s existing pattern exactly.
- "Try Yourself" CTA added to the existing, approved landing page hero and
  header — a targeted addition, not a redesign.
- Admin: a Super-Admin-only "Use as Try Yourself test" toggle on the Test
  Detail page; a "Try Yourself" badge on the Tests list; a "Self-service"
  origin badge on the Assignments list/detail pages.

**The shared Test Runner is completely unmodified.** A public attempt is
handed off to the exact same `/placement/{token}` route and `PlacementFlow`
component an admin-invited candidate uses — `startPublicAttemptAction` creates
a real `PlacementAssignment`/`PlacementInvitation`/`PlacementAttempt` via the
same domain functions and returns the token for the browser to navigate to.
The runner contains no "if public" branching. The one adjacent change: two
closing sentences on the shared result screen ("the center that invited
you...") were reworded to be origin-neutral, since a public visitor was not
invited by anyone — no layout or logic change.

## Admin visibility

Origin badges (see above) distinguish `ADMIN` vs `SELF_SERVICE` assignments;
no separate admin section was built (not needed at MVP scale — self-service
candidates/results appear in the exact same Candidates/Assignments/Results/
export surfaces as any other).

## Session behavior

A second, intentionally distinct session mechanism from Auth.js
(`src/lib/self-serve-session.ts`) — an HMAC-signed (`AUTH_SECRET`, reused for
a second, context-separated purpose), HttpOnly/Secure-in-production/
SameSite=Lax cookie, 30-day expiry, no server-side revocation (same rationale
Auth.js itself gives for its own JWT strategy). A second, separate cookie
holds the plaintext token for the *current* in-progress attempt only — the
same "plaintext exists only in memory/in the one place it's handed off"
model the admin-invited flow already uses for invitation links, just carried
in an HttpOnly cookie instead of a copied URL. "Use another email" clears
only these two cookies, never Auth.js's admin session.

## Required environment variables

See `.env.example`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (both optional —
falls back to a dev-only console provider), `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL`
(optional — the "Contact administrator" button degrades to plain text if
unset). No new required variable — `AUTH_SECRET` is reused.

## Known limitations

- IP-based rate limiting depends on the deployment's reverse proxy setting
  `x-forwarded-for`; if absent (e.g. plain local dev), only the email-scoped
  limit applies.
- If a visitor loses the active-attempt cookie (a different browser/device,
  or a cleared cookie jar) while an attempt is genuinely in progress, the
  server cannot reconstruct the specific token to resume it (no plaintext is
  ever persisted) — `/try` shows "continue from the browser or device where
  you started it" rather than guessing. The completed-attempt **quota**
  itself is never affected by this, since it depends only on the database,
  never on cookies.
- Rate-limit ledger rows are cleaned up opportunistically (on the next write
  to the same bucket), not by a scheduled job — acceptable at MVP volume.
