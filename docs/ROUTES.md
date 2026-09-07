# Routes — Vertex Placement

App Router, under `src/app/`. This lists the route architecture as
scaffolded in Phase 0 plus the shape planned for Phase 1+ — routes marked
**(planned)** don't exist yet.

## Public / unauthenticated

| Route | Purpose | Auth |
| --- | --- | --- |
| `/` | Landing page — "Try Yourself" and "Admin login" CTAs | none |
| `/placement/[token]` | Student entry point — full flow, implemented in Phase 2A. See below. | none — gated by token validity, not by login |
| `/try` | Public self-service ("Try Yourself") entry point — implemented in Phase 2J. See [PHASE_2J_TRY_YOURSELF.md](./PHASE_2J_TRY_YOURSELF.md). | none — gated by a verified-email session cookie, distinct from `/admin` login |

### Student flow (implemented in Phase 2A)

```
/placement/{token}
  -> validate token (see domain/tokens) -> if not found/revoked/already used: error state, no candidate form
     (MVP invitations never expire on a timer, so EXPIRED is not a
     practically reachable case yet — see ARCHITECTURE.md)
  -> welcome -> candidate confirmation -> instructions -> test -> result
     (client-managed phases, ONE route — not the /start, /test, /result
     sub-routes originally sketched here; see
     /docs/PHASE_2A.md "Routes" for why)
```

Everything stays under the same `[token]` segment rather than becoming
`/attempt/[attemptId]/...` — the student never needs to know an attempt ID
exists; the token is their only credential for the entire flow, consistent
with "student does not need an account."

## Admin (authenticated)

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/login` | Credentials sign-in | none (must be unauthenticated to be useful) |
| `/admin` | Dashboard (live counts, recent activity). Implemented in Phase 2B — see [PHASE_2B.md](./PHASE_2B.md). | Admin |

### Implemented in Phase 2B

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/tests` | List `PlacementTest` definitions; create/import | Admin |
| `/admin/tests/[id]` | Test detail — info, bands, assignments; edit/publish/archive | Admin |
| `/admin/candidates` | Candidate list/search + create | Admin |
| `/admin/candidates/[id]` | Candidate detail + their assignments | Admin |
| `/admin/assignments` | Create assignments, pick/enter candidate, generate/regenerate/revoke invitations | Admin |
| `/admin/assignments/[id]` | Assignment detail, invitation history, attempts | Admin |
| `/admin/results/[attemptId]` | Question-by-question answer key + topic/difficulty analysis for one candidate | Admin |

### Implemented in Phase 2C

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/tests/[id]/questions` | Question/option/metadata list + authoring (DRAFT tests only) | Admin |

The import pipeline was **not** built in Phase 2C — questions are
authored one at a time through this page. See
[PHASE_2C.md](./PHASE_2C.md) "Known limitations".

### Also implemented (not originally planned at this path)

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/tests/[testId]/import` (dialog, not a separate route) | Import pipeline UI (upload -> preview -> confirm) | Admin |
| `/admin/profile` | "My account" for every admin; "Admin accounts" management (create/edit/reset password/deactivate/reactivate regular Admins) for Super Admin only — see [PRODUCT_RULES.md](./PRODUCT_RULES.md) "Roles". Built here instead of the originally-sketched `/admin/settings/users`. | Admin (own account) / **Super Admin** (Admin accounts section) |

**Correction pass (pre-deploy phase 2):** test/question/band/import
authoring, and designating the public Try Yourself test, are now Admin
+ Super Admin — see [PRODUCT_RULES.md](./PRODUCT_RULES.md) "Roles" for
why the original Super-Admin-only content-authoring split was removed.
**Super Admin-only** now means exactly one thing: Admin account/role
management (`/admin/profile`'s "Admin accounts" section and its
underlying `admin:manage` permission) — not test/content authoring.

## API / route handlers

| Route | Purpose |
| --- | --- |
| `/api/auth/[...nextauth]` | Auth.js handler (sign in/out, session, CSRF) |

### Planned (not built in Phase 0)

Student-facing actions (start attempt, submit answer, submit test) and
admin mutation endpoints will most likely be implemented as **Server
Actions** colocated with their routes rather than a separate REST-style
`/api/*` surface, matching the App Router default and keeping domain logic
(`src/domain/*`) as the reusable, testable core that both a server action
and, if ever needed, a route handler could call. This isn't finalized —
flagged here so Phase 1 planning starts from a stated default rather than
re-deciding it per feature.

**Attempt auto-submission** does not need a dedicated route or a scheduled
function in the MVP (decision: no cron/sweep job). Every route/action that
touches an `IN_PROGRESS` attempt re-validates `expiresAt` server-side first
and finalizes it as `AUTO_SUBMITTED` on the spot if the deadline has
passed — see [ARCHITECTURE.md](./ARCHITECTURE.md#attempt-lifecycle). The
client-side countdown calling submit at 00:00 is the common-case path;
server-side lazy validation is what makes the deadline authoritative even
if that call never arrives.

## Route protection

- `src/proxy.ts` (Next.js 16's Proxy, formerly Middleware) redirects
  unauthenticated requests to `/admin/*` (except `/admin/login`) to
  `/admin/login`, and redirects already-authenticated requests away from
  `/admin/login`. It does **not** check role — see
  [ARCHITECTURE.md](./ARCHITECTURE.md#authentication--authorization) for
  why role checks live in each route/action instead.
- `/placement/[token]` has no middleware gating at all — a token is not a
  session, and validity (exists / not revoked / not already used, plus the
  underlying attempt's `expiresAt`) must be re-checked on every mutating
  action, not just on first load, since a student could sit on the page
  past the attempt deadline.
- `/try` (Phase 2J) also has no `proxy.ts` gating — it's a second,
  intentionally distinct unauthenticated session (a verified-email cookie,
  never Auth.js's admin session), re-derived server-side on every action; see
  [PHASE_2J_TRY_YOURSELF.md](./PHASE_2J_TRY_YOURSELF.md) "Session behavior".
