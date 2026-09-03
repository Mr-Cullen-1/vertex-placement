# Architecture — Vertex Placement

Phase 0 foundation document. This describes the system as scaffolded, plus
the architecture for pieces that are designed but **not implemented** yet
(import, Telegram, Excel export).

Vertex Placement is a standalone product with its own codebase, dependencies,
database, environment configuration, and Git history. It shares nothing at
the code level with Vertex Quiz — only the brand name and, loosely, a visual
language (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)).

## Technology choices

| Concern         | Choice                                   |
| ---------------- | ----------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)        |
| Language          | TypeScript, strict mode                  |
| Styling           | Tailwind CSS v4 + shadcn/ui primitives    |
| Database          | PostgreSQL                               |
| ORM               | Prisma 7 (`@prisma/adapter-pg` driver adapter) |
| Auth              | Auth.js (next-auth) v5, Credentials provider, JWT sessions |
| Validation        | Zod                                       |
| Password hashing  | bcryptjs                                  |

All choices matched the brief. One thing worth flagging: **Prisma 7**
changed how the datasource connection is configured — `url` no longer lives
in `schema.prisma`; it moved to `prisma.config.ts`, and `PrismaClient` now
requires an explicit driver adapter (`@prisma/adapter-pg` wrapping `pg`)
rather than resolving the URL internally. This is documented inline in
`prisma.config.ts` and `src/lib/db.ts` since it's a recent, easy-to-miss
breaking change relative to most existing Prisma tutorials/examples.

This split turned out to matter for real once the project connected to
Supabase (Phase 1.5): `prisma.config.ts` (CLI — migrations) and
`src/lib/db.ts` (runtime — the driver adapter) now intentionally read
**two different env vars**, `DIRECT_DATABASE_URL` and `DATABASE_URL`
respectively — a managed Postgres provider's pooled connection isn't
suitable for running migrations against, and the app shouldn't hold
direct connections. See [PHASE_1.md](./PHASE_1.md#phase-15--supabase-connection)
for the full rationale and the specific Supabase connection strings each
one maps to.

No ORM/framework substitutions were made — the stack as specified fit
cleanly.

## Folder structure

```
src/
  app/                     — Next.js App Router routes (see ROUTES.md)
    admin/                 — Admin & Super Admin surface (auth-gated)
    placement/[token]/     — Student-facing surface (token-gated, no auth)
    api/auth/[...nextauth]/— Auth.js route handler
  domain/                  — Framework-agnostic business logic and types.
                             No Prisma imports, no Next.js imports. This is
                             where scoring, token, attempt, import, and
                             notification RULES live — kept independent of
                             how they're invoked (route handler, server
                             action, cron job, etc).
    scoring/               — computeScoring: raw score -> difficulty
                             progression -> topic performance -> band match
    tokens/                — token generation/hashing + invitation
                             validation (pure — no Prisma)
    attempts/               — option-order shuffle + server-authoritative
                             timing helpers
    results/                — result *presentation* — student summary vs
                             admin detail views over one PlacementResult
    import/                — Source file -> NormalizedQuestion[] contract
                             (types only — see "Import architecture")
    notifications/         — PLACEMENT_COMPLETED event + adapter contract
                             (types only — see "Telegram integration")
    export/                — Excel workbook shape (types only — see
                             "Excel export")
  server/                  — Prisma-backed service layer + cross-cutting
                             server concerns. Wires domain/* logic to the
                             database; every mutating (and most reading)
                             function takes an explicit `Actor` and starts
                             with `assertPermission(actor, "...")`.
    rbac.ts                — the ONE permission matrix (see "Role-based
                             access control" below)
    errors.ts               — domain error classes (stable `code` +
                             `httpStatus`, no leaked DB internals)
    services/               — one file per aggregate: placement-test,
                             question, placement-band, candidate,
                             assignment, invitation, attempt
    actions/                — thin "use server" wrappers around the
                             services above (not yet wired into any page)
  lib/                     — Framework glue: Prisma client (driver
                             adapter), env validation, Auth.js config,
                             and `actor.ts` (the one place allowed to call
                             `auth()` and hand a plain Actor to `server/`).
  components/ui/           — shadcn/ui primitives
  proxy.ts                 — Next.js 16 "Proxy" (formerly Middleware):
                             gates /admin/* on authentication
prisma/
  schema.prisma            — see DATABASE.md
  migrations/              — committed SQL, including one hand-written
                             migration for a partial unique index (see
                             "Security review" in PHASE_1.md)
  seed.ts                  — Super Admin bootstrap + an optional,
                             clearly-marked DEVELOPMENT-ONLY sample test
tests/
  unit/                    — pure domain logic, no database
  integration/             — real ephemeral Postgres, full service layer
  setup/                   — global setup/teardown, env, db reset helper
scripts/
  local-postgres.mjs       — dev-only local Postgres via embedded-postgres
docs/                      — this document and its siblings, plus PHASE_1.md
design/                    — visual reference material (see DESIGN_SYSTEM.md)
```

**Why `domain/` is separate from `server/`, `lib/`, and `app/`:** the
brief explicitly asks to keep scoring logic separate from presentation,
token logic separate from test definitions, and attempts separate from
assignments. `domain/*` holds pure functions and types with no Prisma or
Next.js imports (scoring math, token hashing/validation, option
shuffling, timing, result presentation) — genuinely unit-testable with no
database in the loop (`tests/unit/*`). `server/*` is one layer up: it's
where that pure logic gets wired to Prisma and to the RBAC/error
machinery, and where the actual attempt/submission/finalization
*orchestration* lives (see PHASE_1.md — that orchestration is real logic
too, just inherently coupled to persistence, so it lives in `server/`
rather than being forced into a "pure" shape it doesn't have).

As of Phase 1, `domain/*` and `server/*` contain real, tested
implementations for test/question/band/candidate/assignment/invitation/attempt
management, RBAC, and the scoring + submission pipeline. `domain/import`,
`domain/notifications`, and `domain/export` remain **type contracts
only** — those three areas are still out of scope (see PHASE_1.md
"Scope boundary"). See [PHASE_1.md](./PHASE_1.md) for the full
implementation report.

## Authentication & authorization

- **Students never authenticate.** They are identified solely by an
  invitation token in the URL — its SHA-256 hash is what's actually
  stored, as `PlacementInvitation.tokenHash` (see "Security review" in
  [PHASE_1.md](./PHASE_1.md)). There is no student account, session, or
  password.
- **Admin / Super Admin** authenticate via Auth.js Credentials provider
  (email + bcrypt-hashed password) against the `User` table. Sessions are
  JWT-based — no database session table, since there's no OAuth provider
  and no server-side session revocation requirement in the MVP.
- **No public registration.** The only way a `User` row is created is:
  1. `prisma/seed.ts`, gated behind `SEED_SUPER_ADMIN_EMAIL` /
     `SEED_SUPER_ADMIN_PASSWORD` env vars, for the very first Super Admin.
  2. A Super Admin creating further Admin/Super Admin accounts through the
     product itself (Phase 2+; not built yet — Phase 1 only builds the
     bootstrap path).
- **Route gating** happens in three layers, from coarsest to finest:
  1. `src/proxy.ts` (Next.js 16's renamed Middleware) redirects
     unauthenticated requests to `/admin/*` (other than `/admin/login`) to
     the login page. Authentication only, no role check.
  2. **RBAC** (`src/server/rbac.ts`) is the single permission matrix —
     every mutating (and most reading) function in `src/server/services/*`
     calls `assertPermission(actor, "...")` as its first line, against an
     explicit `Actor` the caller supplies (never something the service
     resolves from a global/ambient session — see "Role-based access
     control" in [PHASE_1.md](./PHASE_1.md) for why). This is what makes
     "Admin cannot edit test content" actually enforced, not just hidden
     in a UI Super Admin never sees.
  3. Student-facing service functions (`attempt.service.ts`,
     `invitation.service.ts`'s `validateTokenAndLoad`) take no `Actor` at
     all and are gated purely by the invitation token — see "Token
     lifecycle" below.

## PlacementTest lifecycle

```
DRAFT --(Super Admin publishes, requires >=1 PUBLISHED question)--> PUBLISHED --(archive)--> ARCHIVED
DRAFT --(archive)--------------------------------------------------------------------------> ARCHIVED
```

Implemented in `placement-test.service.ts`. A few rules that matter
elsewhere in the system:

- **Only DRAFT is editable.** `updatePlacementTest` and question/option
  edits (`question.service.ts`) refuse once a test is PUBLISHED — a
  published test is what students may be mid-attempt against, so its
  content must not shift under them.
- **A student can never reach a DRAFT test.** `PlacementAssignment`
  creation requires `PUBLISHED` (`assignment.service.ts`), and attempt
  creation independently re-checks `PUBLISHED` too (defense in depth,
  since assignment-time and attempt-time can be far apart) — see "Attempt
  lifecycle" below.
- **Archiving blocks new assignments, not attempts already in progress.**
  If a test is archived while a candidate is mid-attempt, that specific
  attempt can still be resumed, answered, and submitted — only *starting
  a new* attempt/assignment against that test is blocked. `PlacementBand`
  rows remain editable on a PUBLISHED test (institutional scoring rules
  can be tuned without unpublishing) but lock once ARCHIVED, matching
  question/option edits.

## Token lifecycle

See the `PlacementInvitation` model in [DATABASE.md](./DATABASE.md) and
`src/domain/tokens/token.ts` / `src/server/services/invitation.service.ts`
for the implementation. Summary:

```
Admin creates PlacementAssignment (test + candidate)
  -> Admin generates PlacementInvitation (token, status ACTIVE, expiresAt = null)
       -> Student opens /placement/{token}
            - token not found / REVOKED / already USED -> rejected
            - (EXPIRED is reserved for a possible future optional-expiry
               feature — MVP invitations never reach it, see below)
            - token ACTIVE -> candidate info -> PlacementAttempt created
                 -> on submit (or auto-submit), invitation.status -> USED
                 -> that token can never start another attempt
  -> Admin can REGENERATE: previous invitation -> REVOKED,
     new invitation row created against the SAME assignment.
     Regenerating never touches PlacementTest or PlacementAssignment.
```

**MVP decision: invitations do not expire on a fixed timer.**
`PlacementInvitation.expiresAt` is nullable and left unset in the MVP — a
generated link stays `ACTIVE` indefinitely until it is either consumed by a
successfully completed attempt (`USED`) or explicitly invalidated by an
admin action (`REVOKED`, via regeneration or manual revoke). No 24-hour /
7-day / any fixed expiry window is implemented or implied. The nullable
column and the `EXPIRED` status exist so a future *optional*, per-invitation
expiry could be added without a schema migration — but nothing in the MVP
sets or checks it.

## Attempt lifecycle

```
IN_PROGRESS --(student submits)--> SUBMITTED
IN_PROGRESS --(server deadline reached)--> AUTO_SUBMITTED
```

- `PlacementAttempt.expiresAt` is computed once, server-side, at start
  (`startedAt + PlacementTest.durationSeconds`). The frontend runs its own
  countdown from that value — for UX, and to call submit proactively at
  00:00 — but that client timer is never the authority. **MVP decision:
  enforcement is lazy, not scheduled.** There is no cron/sweep job walking
  `IN_PROGRESS` attempts. Instead, every attempt-related request (fetch the
  current question, submit an answer, submit the test) re-checks `now >=
  expiresAt` server-side before doing anything else; if an `IN_PROGRESS`
  attempt is accessed past its deadline — through any such request, or a
  late `SUBMIT` — the handler finalizes it as `AUTO_SUBMITTED` and computes
  the result right then. A student who never touches the page again after
  time runs out leaves the attempt `IN_PROGRESS` until the next access
  (admin viewing results, a later retry) discovers and finalizes it — an
  accepted tradeoff for MVP to avoid background infrastructure. See
  `src/domain/attempts/types.ts`.
- Per-attempt option display order is randomized once at attempt start and
  stored on the attempt (`PlacementAttempt.optionOrder`), so navigating
  backward/forward through the 70 questions always shows the same order to
  that candidate. This never touches `Option.isCorrect` — display order and
  correctness are fully decoupled.
- `PlacementAssignment` -> `PlacementAttempt` is one-to-many in the schema
  even though the MVP only ever produces one. `PlacementAttempt.isCanonical`
  marks the official result. This is intentional headroom for retakes —
  see "Attempts" in [PRODUCT_RULES.md](./PRODUCT_RULES.md).
- **Every public entry point in `attempt.service.ts` takes the invitation
  token, never a bare `attemptId`.** A student has no session, so the
  token is the only thing the server can trust as proof a request is
  allowed to touch a given attempt — an `attemptId` is an internal
  database key, not a credential, and is never accepted as caller-
  supplied input from outside the module (see "Security review" in
  [PHASE_1.md](./PHASE_1.md)).
- **One shared finalization pipeline** (`finalizeAttempt`, private to
  `attempt.service.ts`) handles both manual submission and lazy
  auto-submission — scoring, `PlacementResult` creation, invitation
  invalidation, and canonical-result determination happen in exactly one
  place, inside one transaction, guarded by an atomic
  `status = IN_PROGRESS` conditional update so two racing submit requests
  can't both finalize the same attempt (see PHASE_1.md "Security review"
  — duplicate submission).

## Scoring & result architecture

Deliberately decomposed (see `src/domain/scoring/engine.ts`,
`src/domain/results/*`, and the `PlacementResult` / `PlacementBand`
models):

- **Raw score** (`rawScore`, `totalQuestions`, `percentage`) — purely
  mechanical, derived from `PlacementAnswer` + `Option.isCorrect`.
- **Difficulty progression** and **topic performance** — derived from
  `QuestionMetadata` (band/topic tags) crossed with correctness, snapshotted
  as JSON on `PlacementResult` at scoring time so historical results don't
  shift if metadata is edited later.
- **Placement band** (the level label shown to everyone) — a *lookup*
  against `PlacementBand` rows that a Super Admin configures per test
  (`minPercentage`/`maxPercentage`/`label`). Nothing in the codebase
  hard-codes CEFR boundaries or a specific level name — the source material
  doesn't define official ones, so that mapping is business configuration,
  not code. A test with no configured bands simply has no
  `placementBandId` on its results until one is added.

## Import architecture

```
Source file (PDF | XLSX | JSON | DOCX)
  -> format-specific parser -> NormalizedQuestion[] (single shared shape)
  -> validation -> ImportValidationIssue[] (ERROR blocks import, WARNING doesn't)
  -> preview (shown to Super Admin, nothing persisted as real content yet)
  -> confirm -> Question + Option + QuestionMetadata rows created as DRAFT,
     tagged with importJobId for traceability
  -> explicit publish action -> Question.status DRAFT -> PUBLISHED
```

`ImportJob` (see DATABASE.md) tracks this pipeline's state
(`UPLOADED -> PARSING -> PARSED -> VALIDATED -> IMPORTED`, or
`VALIDATION_FAILED` / `FAILED`). The critical invariant: **imported content
is never auto-published.** `IMPORTED` only means rows exist as `DRAFT`;
publishing a test is a separate, explicit Super Admin action. Each format's
parser only needs to implement `(fileBuffer) => NormalizedQuestion[]`
(`src/domain/import/types.ts`) — everything downstream of that is
format-agnostic.

Still not implemented as of Phase 1: no parsers, no upload endpoint, no
preview UI. The 70 source questions are not imported — question content
in Phase 1 is created directly through `question.service.ts` (used by
tests and the seed's development-only sample test).

## Telegram integration architecture

Event-driven, one-way. Vertex Placement is always the source of truth;
Telegram is a notification consumer, never something the app reads back
from.

```
PlacementAttempt submitted/auto-submitted -> PlacementResult computed
  -> PLACEMENT_COMPLETED domain event emitted
       (src/domain/notifications/types.ts: PlacementCompletedEvent)
  -> NotificationService dispatches to registered NotificationAdapter(s)
  -> TelegramAdapter formats + sends to the configured group via bot API
```

This keeps notification concerns out of the scoring/attempt code — the
attempt-submission code only needs to emit an event, not know that Telegram
exists. Adding email or SMS later means adding another `NotificationAdapter`
implementation, not touching the emitting code.

Still not implemented as of Phase 1: no event emission (the finalize
pipeline in `attempt.service.ts` has a comment marking exactly where it
would hook in), no bot token wiring, no `TelegramAdapter`. `.env.example`
reserves `TELEGRAM_BOT_TOKEN` / `TELEGRAM_GROUP_CHAT_ID` as commented-out
placeholders.

## Excel export architecture

`src/domain/export/types.ts` fixes the shape: a `WorkbookSpec` names which
sheets go into a given export. Admin-triggered exports get the standard
sheet set (`Candidates`, `Results`, `Topic Analysis`); Super Admin exports
add `Question Analysis`. The actual XLSX generation, the endpoint, and any
UI are still not implemented as of Phase 1. `getAdminResultDetail`
(`attempt.service.ts`) already produces the per-attempt data a
`Results`/`Question Analysis` sheet would need — an exporter would
consume that, not recompute it.

## Future extensibility points

- **Retakes**: `PlacementAttempt.isCanonical` and the one-to-many
  `PlacementAssignment -> PlacementAttempt` relation already support a
  second attempt against the same assignment without a schema change — only
  the business rule "MVP rejects a second attempt" needs to change.
- **More import formats**: add a `QuestionParser` implementation; no schema
  or pipeline change needed.
- **More notification channels**: add a `NotificationAdapter`; the emitting
  code and event shape don't change.
- **OAuth for Admin login**: `next-auth` supports adding providers
  alongside Credentials without restructuring the `User` model (an
  `Account`/`Session` adapter table would only be needed if OAuth or
  DB-backed sessions are added later — intentionally not installed now).
- **CEFR mapping refinement**: `PlacementBand` is per-test, so different
  tests (future levels, other subjects) can carry different band
  configurations without migrating existing results.
