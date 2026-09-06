# Database — Vertex Placement

PostgreSQL via Prisma 7. Full schema: [`prisma/schema.prisma`](../prisma/schema.prisma).
This document explains the *why* behind the shape, not just the *what* —
the schema file is the source of truth for fields/types.

## Entity overview

```
User (Admin/Super Admin)
  │
  ├─ creates ─▶ PlacementTest ──┬─▶ Question ──┬─▶ Option
  │                              │              └─▶ QuestionMetadata
  │                              └─▶ PlacementBand
  │
  ├─ creates ─▶ PlacementAssignment ──▶ PlacementInvitation (token)
  │                   │                        │
  │                   │                        └─▶ PlacementAttempt ──┬─▶ PlacementAnswer
  │                   │                                                └─▶ PlacementResult
  │                   └─▶ Candidate
  │
  └─ creates ─▶ ImportJob ──▶ Question (DRAFT, traceable back to the job)
```

## Why each separation exists

The brief was explicit that these concepts must stay distinct, so each one
gets its own note:

**`PlacementTest` vs `Question`/`Option`.** A test is a container with
scoring config (`PlacementBand`) and timing (`durationSeconds`); questions
are ordered content inside it. `Question.order` is a real, meaningful,
**fixed** field — it encodes the source material's progressively-increasing
difficulty sequence and is never touched by randomization logic.
`Option.order` exists too, but only as the *authoring* order; it is never
used to decide what a candidate sees (see `PlacementAttempt.optionOrder`
below).

**`QuestionMetadata` as its own table, not columns on `Question`.**
Topic/difficulty-band tagging and import provenance are analytics/import
concerns, not core question content. Splitting them means editing a
question's metadata (retagging a topic, say) never touches the
content/scoring-relevant row, and the import pipeline can populate metadata
independently of how the question text itself was authored.

**`PlacementBand` instead of a hard-coded CEFR enum.** The source material
gives progressive difficulty bands and "teacher discretion," not official
score boundaries. Inventing fixed CEFR cutoffs would be asserting something
the source doesn't support. Instead, `PlacementBand` is configuration data
— rows a Super Admin creates per test (`label`, `description`, plus an
explicit `scoringMode`) — and `PlacementResult.placementBandId` is a
nullable lookup, not a computed enum. A test with no configured bands
simply produces results with no placement label yet, rather than a
fabricated one.

**`scoringMode` instead of always-percentage (Phase 2L).** A band is
either `PERCENTAGE` (`minPercentage`/`maxPercentage: Float?`, the
original mechanism — every pre-Phase-2L row) or `RAW_SCORE`
(`minRawScore`/`maxRawScore: Int?`, added for the real Language Hub
test's approved institutional policy, matched against total correct
answers directly). Both pairs of columns are nullable; a band only
populates the pair matching its own mode. The resolver
(`matchPlacementBand`) branches on each band's own `scoringMode` — never
a hidden conversion between raw score and percentage. See
[PHASE_2L_SCORING_POLICY.md](./PHASE_2L_SCORING_POLICY.md).

**`PlacementResult.finalPlacementLabel`/`finalPlacementSetByUserId`/
`finalPlacementSetAt` (Phase 2L)** — a separate, nullable, administrative
override ("Final Placement"), distinct from `placementBandId`
("Recommended Level"). `null` means no override; the UI then displays the
Recommended Level itself. Never written by the scoring pipeline — only by
`setFinalPlacement`, gated on the `result:write` permission.

**`PlacementTest` / `PlacementAssignment` / `PlacementInvitation` /
`PlacementAttempt` as four separate models**, not one row with status
columns:

- `PlacementAssignment` is "Admin decided candidate X should take test Y" —
  it's the session/intent, independent of any link ever being generated.
- `PlacementInvitation` is a single token. It belongs to an *assignment*,
  never directly to a *test*. **Regenerating a link creates a new
  `PlacementInvitation` row** (previous one flips to `REVOKED`, linked via
  `regeneratedFromId`) **without touching `PlacementAssignment` or
  `PlacementTest` at all.** This is the literal requirement from the brief:
  "Regenerating a link is NOT the same thing as creating a retake" and
  "the invitation/token belongs to an assignment/session, not directly to
  the test definition." `expiresAt` is nullable and unset by default — MVP
  invitations stay `ACTIVE` until `USED` or `REVOKED`, not on a timer (see
  [ARCHITECTURE.md](./ARCHITECTURE.md#token-lifecycle)).
- `PlacementAttempt` is the actual act of taking the test — one row per
  attempt, holding the server-authoritative `expiresAt`, the randomized
  `optionOrder`, and the answers. It references the specific invitation
  that was consumed to start it (`invitationId`, unique — one invitation
  can start at most one attempt).

Splitting these four ways is what makes "regenerate a link" and "retake the
test" different operations at the data level, and lets retakes be added
later (a second `PlacementAttempt` under the same `PlacementAssignment`)
without redesigning assignments or invitations.

**`Candidate` as its own table, not embedded in `PlacementAssignment`.**
Candidates never authenticate, but the same person could plausibly be
assigned more than one placement test over time (different cohorts,
retesting policy changes later). Keeping `Candidate` independent avoids
duplicating name/phone/age/email every time, and keeps "who took this test"
queryable without joining through assignments first.

**`PlacementAnswer` separate from `PlacementAttempt`.** One row per
question per attempt (`@@unique([attemptId, questionId])`), with a nullable
`selectedOptionId` so a skipped question is representable. Students can
move forward/backward and change answers freely — this is a straightforward
upsert target, not an append-only log, since only the latest answer per
question matters.

**`PlacementResult` separate from `PlacementAttempt`.** The attempt is the
raw, replayable record (what was answered, when, in what order options were
shown). The result is *derived* — computed once at submission. Keeping them
apart means re-scoring logic (if a scoring bug is fixed later) has a clear
input (the attempt + its answers) and a clear output (a new result), rather
than mutating fields on the same row that also holds the raw submission
data.

**`optionOrder` as JSON on `PlacementAttempt` rather than a join table.**
Considered a dedicated `PlacementAttemptOptionOrder(attemptId, questionId,
optionId, displayOrder)` table for stricter relational integrity. Chose
JSON (`{ [questionId]: optionId[] }`) instead: it's written exactly once
(at attempt start), read exactly once per question render, never queried
or filtered on independently of its parent attempt, and Postgres JSONB
handles that access pattern fine. A join table would add write/read
overhead for a value that's never joined against anything. If per-option
display-order analytics become a real query need later, this is the one
schema decision most likely to be revisited.

**`ImportJob` as a first-class table.** Not strictly required for Phase 0
(nothing is imported yet), but the brief asks for the import pipeline's
architecture to be established now, and `Question.importJobId` gives
imported content traceability back to its source file/parse run from day
one — useful the moment real imports start, and free to add now versus a
later migration touching every existing `Question` row.

## Auth tables

Only `User` (Admin/Super Admin, `role: UserRole`). No `Account`, `Session`,
or `VerificationToken` tables — Auth.js is configured for JWT sessions with
a single Credentials provider, so there's no OAuth account linking and no
server-side session store to back. If OAuth or DB-backed session revocation
is added later, `@auth/prisma-adapter` (evaluated, not installed — see
[ARCHITECTURE.md](./ARCHITECTURE.md)) would introduce those tables via
migration at that point.

## Indexes worth calling out

- `PlacementInvitation.tokenHash` — unique, indexed. This is the hot
  lookup path for every student request (`/placement/{token}`) — the
  incoming plaintext token is hashed first, then looked up by hash (see
  "Security review" in [PHASE_1.md](./PHASE_1.md)).
- `Candidate.phoneNumber` — indexed (not unique — duplicate names/phones
  across candidates are legitimate) for admin lookup/search.
- `Question @@unique([testId, order])` and `Option @@unique([questionId,
  order])` — enforce that fixed ordering is actually unique per parent,
  catching import/authoring bugs at the database level.
- `PlacementInvitation` has a hand-written **partial unique index**
  (migration `20260903111521_active_invitation_unique_index`, added in
  Phase 1) enforcing at most one `ACTIVE` invitation per assignment at
  the database level — Prisma's schema DSL has no portable way to
  express a partial unique index, so this one migration is raw SQL. It
  closes the race window in the application-level check
  (`invitation.service.ts`) between "does an ACTIVE invitation already
  exist" and "create one".

## Open decisions for Phase 1+

These are flagged rather than guessed at, per the instruction to document
ambiguity instead of inventing business rules:

- ~~Exact `PlacementBand` values (labels, percentage cutoffs) for the
  Language Hub test~~ — **resolved in Phase 2L**: Vertex's own
  institutional RAW_SCORE policy (0–6 Beginner, 7–17 Elementary, 18–34
  Pre-Intermediate, 35–48 Intermediate, 49–60 Upper Intermediate, 61–70
  Advanced), applied via `applyLanguageHubInstitutionalBands`. See
  [PHASE_2L_SCORING_POLICY.md](./PHASE_2L_SCORING_POLICY.md).
- Whether `Candidate` should ever get a uniqueness constraint (e.g. phone +
  name) to detect duplicates — left open; the source material doesn't
  specify a dedup policy and inventing one risks rejecting legitimate
  re-tests.

The following were open in the Phase 0 report and have since been decided
(kept here for history rather than deleted):

- ~~Attempt auto-submission trigger mechanism~~ — **decided**: on-request
  lazy check, no scheduled sweep/cron in the MVP. See
  [ARCHITECTURE.md](./ARCHITECTURE.md#attempt-lifecycle).
- ~~Invitation expiry duration~~ — **decided**: `PlacementInvitation.expiresAt`
  is nullable and unset in the MVP; invitations don't expire on a fixed
  timer, only via `USED` or `REVOKED`. See
  [ARCHITECTURE.md](./ARCHITECTURE.md#token-lifecycle).
