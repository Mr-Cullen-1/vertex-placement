# Product Rules — Vertex Placement

Canonical reference for business rules, distilled from the product brief.
Where the brief left something ambiguous, that's called out explicitly
under "Open decisions" rather than resolved with an invented rule.

## Source material

MVP is based on the authorized *"Language Hub Placement Test Beginner to
Advanced,"* Macmillan Education, 2019: 70 multiple-choice questions, 4
options each, 30 minutes max, progressively increasing difficulty, fixed
question order. **Not** implemented/imported in Phase 0 — the source file
will be added separately.

This is **not** an adaptive/CAT test. Question order is fixed; only answer
option order is randomized per attempt.

## Roles

| | Super Admin | Admin | Student/Candidate |
| --- | --- | --- | --- |
| Account | yes | yes | **no** — token only |
| Create/edit `PlacementTest` definitions | ✅ | ❌ | — |
| Import questions | ✅ | ❌ | — |
| Manage answer keys | ✅ | ❌ | — |
| Configure `QuestionMetadata` | ✅ | ❌ | — |
| Configure scoring/`PlacementBand` | ✅ | ❌ | — |
| Create `PlacementAssignment` / candidates | ✅ | ✅ | — |
| Generate/regenerate invitation tokens | ✅ | ✅ | — |
| View candidates/results | ✅ (everything) | ✅ | own result only |
| Export analytics | ✅ full | ✅ standard | ❌ |

Enforced in code, not just UI, as of Phase 1: `src/server/rbac.ts` holds
the single permission matrix, and every mutating (and most reading)
function in `src/server/services/*` checks it against an explicit actor
before touching the database. See "Authentication & authorization" in
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Student flow

```
Invitation link (https://.../placement/{token})
  -> candidate information (required: first name, last name, phone, age;
     optional: email)
  -> start test
  -> 70 questions — forward, backward, skip, and change-answer all allowed
  -> submit (manual) or auto-submit (server timeout)
  -> result (summary only)
```

No account required. No immediate correct/incorrect feedback during the
test — the student sees only the final result, after submission.

## Test rules

- **Duration**: 30 minutes maximum, **server-authoritative**. The frontend
  runs its own countdown from the server-issued deadline and calls submit
  at 0 for normal-case UX, but the server independently re-validates
  `expiresAt` on every attempt-related request and finalizes a late
  attempt as auto-submitted regardless of whether the client ever calls
  submit — see [ARCHITECTURE.md](./ARCHITECTURE.md#attempt-lifecycle). No
  scheduled/cron sweep is used in the MVP; enforcement is on-access.
- Frontend timer states: normal -> visually urgent at 5 minutes remaining
  -> automatic submission at 0.
- **Question order**: fixed, matches the source material. Never randomized.
- **Answer option order**: randomized per attempt. Must never change which
  option is scored as correct (`Option.isCorrect` is independent of display
  order — see [DATABASE.md](./DATABASE.md)).
- **Progress**: shown as "Question N of 70" plus a minimal progress
  indicator. No section/stage indicator required.

## Attempts

- Architecture supports multiple attempts per assignment
  (`PlacementAttempt.isCanonical`, one-to-many from `PlacementAssignment`),
  but the **MVP behavior** is: the first *completed* attempt is the
  official result, and a token that has been used to complete a test
  becomes invalid — it cannot be reopened to start another attempt.
- Retake functionality is **not exposed** to students in the MVP. Nothing
  in the UI or the token flow offers "try again."
- **Regenerating a link is not a retake.** Regenerating creates a new
  `PlacementInvitation` against the *same* `PlacementAssignment` (e.g. the
  original link was lost, sent to the wrong contact, or needs to be
  reissued before the student ever started — not because it expired; see
  "Invitations don't expire on a timer" below) — it does not create a new
  attempt and does not touch the test definition.
- **A candidate can already have multiple attempts over time** at the
  schema level, without any migration: `Candidate` 1:N `PlacementAssignment`
  1:N `PlacementAttempt`. Nothing about the MVP restricts a candidate to one
  `PlacementAssignment` for life — an admin creating a second assignment for
  the same candidate (a different test, or a policy-driven re-test later)
  is already representable. What the MVP restricts is narrower and
  specific: *within a given assignment*, a token that completed an attempt
  cannot start another one. `isCanonical` marks the official attempt per
  assignment once an assignment is ever allowed to hold more than one.
- **Invitations don't expire on a timer.** `PlacementInvitation.expiresAt`
  is nullable and unset in the MVP — no fixed window such as 24 hours or 7
  days. A generated link stays valid until it is either consumed by a
  completed attempt (`USED`) or explicitly revoked/regenerated
  (`REVOKED`). See [ARCHITECTURE.md](./ARCHITECTURE.md#token-lifecycle).

## Scoring & placement

- Do not invent official CEFR score boundaries — the source material
  provides progressive difficulty bands and placement guidance including
  teacher discretion, not fixed cutoffs. Vertex's own institutional
  policy for the real Language Hub test (Phase 2L, below) is explicitly
  disclosed as Vertex's decision, never presented as a Macmillan cutoff
  table.
- Scoring and placement mapping are **configurable business logic**
  (`PlacementBand`, per test), set by a Super Admin — not hard-coded.
  Each band declares its own `scoringMode` (`PERCENTAGE` or `RAW_SCORE`,
  Phase 2L) — never inferred, never silently converted between the two.
  See [PHASE_2L_SCORING_POLICY.md](./PHASE_2L_SCORING_POLICY.md).
- Kept separate at every layer: raw score, percentage, difficulty
  progression, topic performance, and placement-band label are distinct
  fields/concepts, not folded into one computed value. See
  [ARCHITECTURE.md](./ARCHITECTURE.md#scoring--result-architecture).
- **"Recommended Level" (`level`) is always `PlacementBand` matched
  against TOTAL CORRECT SCORE — raw score or percentage, per that band's
  own `scoringMode` — never influenced by which specific question was
  answered correctly.** This is computed once, at attempt finalization
  (`computeScoring`/`matchPlacementBand`), and persisted as a snapshot on
  `PlacementResult.placementBandId` — every consumer (student result,
  admin result, assignment list, export) reads that same persisted
  value; none recomputes it independently. Renamed from an unqualified
  "level" to "Recommended Level" in every student-facing surface (Phase
  2L) — it's an automated recommendation, not an immutable academic
  placement decision.
- **Final Placement** (Phase 2L, `PlacementResult.finalPlacementLabel`)
  is a SEPARATE, ADMINISTRATIVE decision — an Admin or Super Admin may
  override the institution's final placement to any of the six standard
  Vertex levels, independent of the Recommended Level. Setting it never
  mutates `rawScore`, `percentage`, or `placementBandId`. Who set it and
  when is recorded (`finalPlacementSetByUserId`/`finalPlacementSetAt`).
  Never shown or editable on a student-facing surface, and never
  available for Try Yourself (self-service) candidates — see
  [PHASE_2L_SCORING_POLICY.md](./PHASE_2L_SCORING_POLICY.md).
- **Question progression** (`computeAnswerBreakdown`'s `progressionBand`
  — the highest correctly-answered question number, mapped through the
  source's fixed six question-number ranges) and **course-level
  performance** (Phase 2L, `computeCourseLevelPerformance` — a full
  per-band correct/incorrect/unanswered breakdown across those same six
  ranges) are SEPARATE DIAGNOSTIC signals, never persisted, always
  recomputed from raw answers on read. Question progression **must
  never be shown to a student**; course-level performance IS shown to a
  student, but only inside the collapsed-by-default "Detailed analysis"
  section, explicitly labeled diagnostic and never rendered as if it
  were `level`. **P0 fix (Phase 2J)**: question progression was
  previously also rendered on the student result screen as "Recommended
  progression," which could show e.g. "Advanced" for a 4/70-correct
  result if the one correct answer happened to be a late/hard question —
  a real, reported bug. Removed from the student-facing result entirely.

## Results

**Student sees:** Recommended Level (`PlacementBand`, score-based —
absent if the test has no configured bands; never substituted with
question-progression diagnostics), score, percentage, completion time, a
concise performance summary, and (Phase 2L, collapsed by default) a
Detailed Analysis section: course-level performance, an evidence-aware
strength/weakness summary, and a question-by-question answer review.
**Never**: Final Placement (admin-only), the question-progression
diagnostic.

**Admin sees:** candidate information, score, percentage, Recommended
Level, Final Placement (with override), completion time, difficulty
progression, course-level performance, question-by-question analysis,
topic analysis, and — clearly labeled as diagnostic-only, never as the
official level — question progression evidence. The admin result page
visually separates these into three groups: OBJECTIVE RESULT,
ADMINISTRATIVE DECISION, DIAGNOSTIC ANALYSIS (Phase 2L).

Implemented as of Phase 1 (student-safe view) and extended in Phase 2L
(Detailed Analysis, Final Placement): `buildStudentResultSummary`
produces exactly the student-safe view; `getAdminResultDetail`
(`attempt.service.ts`) produces the full admin view, including
question-by-question analysis — reading it requires `result:read`
(Admin or Super Admin); setting Final Placement requires `result:write`
(also both roles), enforced the same way as every other RBAC check.

## Analytics

Admin dashboard should eventually support: total candidates, completed
tests, incomplete tests, average score, average completion time, level
distribution, question performance, topic performance. Super Admin gets
full analytics; Admin gets the standard set. **No fake/sample analytics
data was created in Phase 0** — the dashboard itself is not built yet.

## Import

Source formats to support eventually: PDF, XLSX, JSON, DOCX. Pipeline:
source file -> parser -> normalized question schema -> validation ->
preview -> confirm -> draft -> publish. **Imported content is never
auto-published** — see [ARCHITECTURE.md](./ARCHITECTURE.md#import-architecture).
Not implemented in Phase 0.

## Telegram

After a placement test completes, a detailed result should eventually post
to a Telegram group via a bot, using an event/service architecture
(`PLACEMENT_COMPLETED` -> notification service -> Telegram adapter). Vertex
Placement remains the source of truth. Not implemented in Phase 0 — only
the architecture is designed.

## Public self-service ("Try Yourself")

See [PHASE_2J_TRY_YOURSELF.md](./PHASE_2J_TRY_YOURSELF.md) for the full
design. Summary of the product rules it implements:

- A visitor verifies an email (6-digit code, 10-minute expiry) before
  entering any personal details — email-first, not registration.
- A verified email maps to exactly ONE `Candidate`, forever (`PublicIdentity`
  table) — never a new one per visit, and never merged with an unrelated
  admin-created candidate that happens to share the same email string.
- Exactly **two free completed attempts** per verified identity. Opening the
  test, refreshing, or resuming never consumes one — only a successful
  submission does. At most one active (not-yet-completed) attempt at a time,
  enforced at the database level.
- Exactly one `PlacementTest` may be designated the public entry point at a
  time (`isPublicSelfService`), set explicitly by a Super Admin — never the
  newest/first-published/a hard-coded test.
- A public attempt uses the exact same Test Runner, scoring engine, and
  `PlacementBand` mechanism as an admin-assigned attempt — no second
  implementation of any of those exists.

## Excel export

Admin gets a standard export; Super Admin gets a full export. Planned
workbook sheets: Candidates, Results, Question Analysis (Super Admin
only), Topic Analysis. Not implemented in Phase 0.

## Open decisions

Still genuinely open, flagged rather than guessed at:

- **Exact `PlacementBand` configuration** for the Language Hub test (which
  percentage ranges map to which labels) — depends on the actual source
  material and any institutional guidance, neither of which is available
  yet. Stays configurable business logic; nothing hard-coded.
- **Duplicate candidates** — no dedup rule specified by the brief; not
  invented.

Resolved since the Phase 0 report (kept here for history):

- ~~Invitation expiry duration~~ — **decided**: no fixed expiry.
  `PlacementInvitation.expiresAt` is nullable and unset in the MVP; a link
  is valid until `USED` or `REVOKED`, never on a timer.
- ~~Auto-submission trigger mechanism~~ — **decided**: on-access lazy
  validation, no scheduled sweep/cron. The client times out and calls
  submit for UX; the server independently re-checks `expiresAt` on every
  attempt-related request and finalizes late attempts as `AUTO_SUBMITTED`
  whenever one is next touched.
