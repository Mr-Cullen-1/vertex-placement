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
    scoring/               — Raw score -> difficulty progression -> topic
                             performance -> placement band mapping
    tokens/                — Invitation validation/regeneration contracts
    attempts/              — Attempt state machine, server-authoritative timing
    import/                — Source file -> NormalizedQuestion[] contract
    notifications/         — PLACEMENT_COMPLETED event + adapter contract
    export/                — Excel workbook shape
  lib/                     — Infrastructure: Prisma client, env validation,
                             Auth.js config. Wires domain logic to the
                             framework/database; domain code never imports
                             from here.
  components/ui/           — shadcn/ui primitives
  proxy.ts                 — Next.js 16 "Proxy" (formerly Middleware):
                             gates /admin/* on authentication
prisma/
  schema.prisma            — see DATABASE.md
  seed.ts                  — bootstraps the first Super Admin only
docs/                      — this document and its siblings
design/                    — visual reference material (see DESIGN_SYSTEM.md)
```

**Why `domain/` is separate from `lib/` and `app/`:** the brief explicitly
asks to keep scoring logic separate from presentation, token logic separate
from test definitions, and attempts separate from assignments. Modeling
those as distinct TypeScript modules (not just distinct DB tables) means a
route handler or a future cron job can call the same scoring function
without duplicating logic, and the logic can be unit-tested without a
database or an HTTP request in the loop.

In Phase 0 the `domain/*` folders contain **only type contracts** — no
business logic is implemented (per the Phase 0 scope: no scoring, no token
issuance, no attempt flow yet). The types exist so the shape of each
domain is fixed before implementation starts, and so `docs/` can point at
real code instead of prose-only descriptions.

## Authentication & authorization

- **Students never authenticate.** They are identified solely by a
  `PlacementInvitation.token` in the URL. There is no student account,
  session, or password.
- **Admin / Super Admin** authenticate via Auth.js Credentials provider
  (email + bcrypt-hashed password) against the `User` table. Sessions are
  JWT-based — no database session table, since there's no OAuth provider
  and no server-side session revocation requirement in the MVP.
- **No public registration.** The only way a `User` row is created is:
  1. `prisma/seed.ts`, gated behind `SEED_SUPER_ADMIN_EMAIL` /
     `SEED_SUPER_ADMIN_PASSWORD` env vars, for the very first Super Admin.
  2. A Super Admin creating further Admin/Super Admin accounts through the
     product itself (Phase 1+; not built yet).
- **Route gating** happens in two layers:
  1. `src/proxy.ts` (Next.js 16's renamed Middleware) redirects
     unauthenticated requests to `/admin/*` (other than `/admin/login`) to
     the login page. This is coarse — authentication only.
  2. **Role** (Admin vs Super Admin) is *not* checked in proxy — Next.js's
     own guidance is to treat Proxy as a first line of defense and verify
     authorization again inside each Server Function/route handler, since a
     matcher change can silently stop covering a path. Role checks belong
     in each Super-Admin-only route/action once those are built. See
     [ROUTES.md](./ROUTES.md) for the permission matrix.

## Token lifecycle

See the `PlacementInvitation` model in [DATABASE.md](./DATABASE.md). Summary:

```
Admin creates PlacementAssignment (test + candidate)
  -> Admin generates PlacementInvitation (token, status ACTIVE, expiresAt)
       -> Student opens /placement/{token}
            - token not found / EXPIRED / REVOKED / already USED -> rejected
            - token ACTIVE and not expired -> candidate info -> PlacementAttempt created
                 -> on submit (or auto-submit), invitation.status -> USED
                 -> that token can never start another attempt
  -> Admin can REGENERATE: previous invitation -> REVOKED,
     new invitation row created against the SAME assignment.
     Regenerating never touches PlacementTest or PlacementAssignment.
```

## Attempt lifecycle

```
IN_PROGRESS --(student submits)--> SUBMITTED
IN_PROGRESS --(server deadline reached)--> AUTO_SUBMITTED
```

- `PlacementAttempt.expiresAt` is computed once, server-side, at start
  (`startedAt + PlacementTest.durationSeconds`). The frontend timer is a
  presentation of that deadline, never the authority over it — any submit
  request arriving after `expiresAt` is treated as an auto-submission
  boundary case, and a background/periodic check (Phase 1+) auto-submits
  attempts whose deadline has passed regardless of client activity.
- Per-attempt option display order is randomized once at attempt start and
  stored on the attempt (`PlacementAttempt.optionOrder`), so navigating
  backward/forward through the 70 questions always shows the same order to
  that candidate. This never touches `Option.isCorrect` — display order and
  correctness are fully decoupled.
- `PlacementAssignment` -> `PlacementAttempt` is one-to-many in the schema
  even though the MVP only ever produces one. `PlacementAttempt.isCanonical`
  marks the official result. This is intentional headroom for retakes —
  see "Attempts" in [PRODUCT_RULES.md](./PRODUCT_RULES.md).

## Scoring & result architecture

Deliberately decomposed (see `src/domain/scoring/types.ts` and the
`PlacementResult` / `PlacementBand` models):

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

Not implemented in Phase 0: no parsers, no upload endpoint, no preview UI.
The 70 source questions are not imported.

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

Not implemented in Phase 0: no event emission, no bot token wiring, no
`TelegramAdapter`. `.env.example` reserves `TELEGRAM_BOT_TOKEN` /
`TELEGRAM_GROUP_CHAT_ID` as commented-out placeholders.

## Excel export architecture

`src/domain/export/types.ts` fixes the shape: a `WorkbookSpec` names which
sheets go into a given export. Admin-triggered exports get the standard
sheet set (`Candidates`, `Results`, `Topic Analysis`); Super Admin exports
add `Question Analysis`. The actual XLSX generation, the endpoint, and any
UI are not implemented in Phase 0.

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
