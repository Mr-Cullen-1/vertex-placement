# Routes — Vertex Placement

App Router, under `src/app/`. This lists the route architecture as
scaffolded in Phase 0 plus the shape planned for Phase 1+ — routes marked
**(planned)** don't exist yet.

## Public / unauthenticated

| Route | Purpose | Auth |
| --- | --- | --- |
| `/` | Placeholder landing page | none |
| `/placement/[token]` | Student entry point. Placeholder in Phase 0 — see below for the intended flow. | none — gated by token validity, not by login |

### Student flow (planned, not built in Phase 0)

```
/placement/{token}
  -> validate token (see domain/tokens) -> if invalid/expired/used: error state, no candidate form
  -> /placement/{token}/start        candidate info form (first/last name, phone, age, optional email)
  -> /placement/{token}/test         the 70-question flow (forward/back/skip, fixed question order)
  -> /placement/{token}/result       clean summary only — no answer key, no per-question review
```

All of these stay under the same `[token]` segment rather than becoming
`/attempt/[attemptId]/...` — the student never needs to know an attempt ID
exists; the token is their only credential for the entire flow, consistent
with "student does not need an account."

## Admin (authenticated)

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/login` | Credentials sign-in | none (must be unauthenticated to be useful) |
| `/admin` | Landing after login. Placeholder in Phase 0. | Admin |

### Planned admin surface (not built in Phase 0)

| Route | Purpose | Minimum role |
| --- | --- | --- |
| `/admin/tests` | List/manage `PlacementTest` definitions | **Super Admin** |
| `/admin/tests/[testId]` | Edit a test: questions, options, scoring bands | **Super Admin** |
| `/admin/tests/[testId]/import` | Import pipeline UI (upload -> preview -> confirm) | **Super Admin** |
| `/admin/assignments` | Create assignments, enter candidate info, generate/regenerate tokens | Admin |
| `/admin/assignments/[assignmentId]` | Assignment detail, invitation history | Admin |
| `/admin/candidates` | Candidate list/search | Admin |
| `/admin/results` | Results list | Admin (standard view) / Super Admin (full view) |
| `/admin/results/[attemptId]` | Question-by-question + topic analysis for one candidate | Admin |
| `/admin/analytics` | Aggregate dashboard (level distribution, question/topic performance) | Admin (standard) / Super Admin (full export) |
| `/admin/settings/users` | Manage Admin/Super Admin accounts | **Super Admin** |

**Admin cannot**, per the product rules: create/edit test definitions,
modify scoring configuration or answer keys, or import/edit test content.
Every route above marked **Super Admin** enforces that boundary; every
other `/admin/*` route is reachable by both roles but Admin-facing views
never expose test-authoring actions.

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

One exception: **attempt auto-submission** on timeout most likely needs a
route handler (or scheduled function) reachable independent of a specific
user's request, since "the timer must be authoritative on the server" means
an attempt can expire with nobody watching the page.

## Route protection

- `src/proxy.ts` (Next.js 16's Proxy, formerly Middleware) redirects
  unauthenticated requests to `/admin/*` (except `/admin/login`) to
  `/admin/login`, and redirects already-authenticated requests away from
  `/admin/login`. It does **not** check role — see
  [ARCHITECTURE.md](./ARCHITECTURE.md#authentication--authorization) for
  why role checks live in each route/action instead.
- `/placement/[token]` has no middleware gating at all — a token is not a
  session, and validity (exists / not expired / not revoked / not already
  used) must be re-checked on every mutating action, not just on first
  load, since a student could sit on the page past expiry.
