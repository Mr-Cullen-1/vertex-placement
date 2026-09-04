# Phase 2C — Test Management

Status: complete. Gives Super Admin a real authoring surface for
`PlacementTest`/`Question`/`Option`/`QuestionMetadata`/`PlacementBand`
before the real 70-question source is imported. Builds on
[PHASE_1.md](./PHASE_1.md) (services/RBAC/security model) and
[PHASE_2B.md](./PHASE_2B.md) (admin shell, Tests list/detail) without
redesigning either.

**No schema/migration change was needed and no RBAC change was needed** —
every capability this phase exposes was already backed by an existing
Phase 1 domain model and permission (`test:write`/`question:write`/
`band:write`, Super Admin only; `test:read`, both roles). See "Decisions"
below for the one service-layer fix and two small additions made inside
the existing domain layer.

## Implemented routes

```
/admin/tests/[id]/questions   Question list + authoring (new)
```

`/admin/tests` and `/admin/tests/[id]` (Phase 2B) are extended, not
replaced: the detail page gained a "Questions" link and an editable
placement-bands panel for Super Admin; no new top-level nav item was
added (Tests already covers this area, per Phase 2B's "Tests is
read-only for Admin" pattern).

## Question authoring (`/admin/tests/[id]/questions`)

- Visible to both roles (`test:read`); authoring controls (add/edit/
  publish/delete/reorder) render only for a Super Admin viewing a
  **DRAFT** test — matching the existing `question.service.ts` rule that
  content edits are DRAFT-only. A Super Admin viewing a non-DRAFT test
  sees an explanatory read-only notice instead of a dead end.
- **Create/edit** (`QuestionFormDialog`): prompt, 2–10 options with
  exactly one marked correct (native radio group, client-validated
  before submit and re-validated server-side by
  `assertExactlyOneCorrectOption`), and `QuestionMetadata`
  (`difficultyBand` — free-text with the six source-material bands as
  `<datalist>` suggestions, never a hard-coded enum; `topic`; `tags`;
  `sourceRef`). Copy in the form explicitly states metadata "does not
  make the test adaptive."
- **Order** is never a form field — a new question is always appended
  (`nextOrder = questions.length + 1`); reassigning order is a separate
  explicit action (`QuestionList`'s up/down controls calling
  `reorderQuestions`), so the fixed-progressive-order invariant is never
  exposed as an editable number a Super Admin could collide with by
  hand.
- **Publish** a single question (separate from publishing the test —
  matches the existing two-level model: `publishPlacementTest` already
  required ≥1 published question).
- **Delete** a question — new; only while its test is DRAFT (see
  "Decisions").

## Placement bands (`BandsManager`, embedded in the test detail page)

Replaces the Phase 2B read-only band list with a full editor for Super
Admin (Admin still sees the Phase 2B read-only list): add/edit/delete a
band (label, min/max %, order, description), locked once the test is
ARCHIVED — mirroring `placement-band.service.ts`'s own guard, which
still re-checks this independent of what the UI renders. Deleting a band
warns that already-computed results placed in it lose that level label
(`PlacementResult.placementBandId` is `ON DELETE SET NULL` — verified
against the actual migration SQL, not assumed) — the raw score/
percentage are unaffected. No CEFR cutoffs are pre-filled anywhere; every
value is whatever the org enters, unchanged from Phase 1's design.

## Server actions (new)

- `src/server/actions/question-actions.ts` — `createQuestionAction`,
  `updateQuestionAction`, `publishQuestionAction`, `deleteQuestionAction`,
  `reorderQuestionsAction`.
- `src/server/actions/band-actions.ts` — `createPlacementBandAction`,
  `updatePlacementBandAction`, `deletePlacementBandAction`.

Same thin-wrapper pattern as every other Phase 2B action file:
`runAction(async () => { const actor = await getActorOrThrow(); return
<service call>(actor, ...); })` — the actor always comes from the
session, never from client input, and RBAC is enforced exactly once, in
the service layer, not duplicated here or in any component.

## Decisions

Three small, targeted changes inside `question.service.ts` — no new
architecture, no schema change:

1. **Fixed a real gap: `publishQuestion` didn't check test status.**
   Before this phase, a question left DRAFT when its test was published
   could later be published on its own, silently adding a question to a
   test students might already be mid-attempt against — `createQuestion`
   and `updateQuestion` already guarded on `test.status === "DRAFT"`,
   but `publishQuestion` did not. Added the same guard. Covered by a
   regression test (`test-management.test.ts`, "a question left draft
   cannot be published once its test is already published").
2. **Added `deleteQuestion`** — no removal path existed at all (no
   ARCHIVED question status, no "unpublish"). Restricted to
   `test.status === "DRAFT"`, the same guard `createQuestion`/
   `updateQuestion` already use — safe by construction, since an attempt
   can only ever start against a PUBLISHED test
   (`attempt.service.ts`), so while a test is DRAFT no
   `PlacementAnswer` can reference any of its questions yet, regardless
   of the question's own DRAFT/PUBLISHED status.
3. **Added `reorderQuestions`** — reassigns `order` for a test's full
   question set from a given id sequence, in a two-pass transaction
   (temporary negative values, then final values) to avoid colliding
   with `@@unique([testId, order])` mid-shuffle. Same DRAFT-only guard.

No ambiguous business rule was encountered that needed a stop-and-ask —
every rule this phase needed (published-question-count gate on
publishing a test, DRAFT-only content edits, ARCHIVED-only band lock)
already existed in the Phase 1 domain layer; this phase only had to
apply the same guard consistently to the two new/fixed operations above.

## Permissions

No RBAC changes. `test:write`/`question:write`/`band:write` remain
Super-Admin-only in `src/server/rbac.ts` (unchanged); `test:read` stays
both roles. Every new Server Action calls the exact service function
Phase 1's/this phase's own test suite exercises directly — a direct
action call from an Admin session is rejected server-side regardless of
what the UI renders (verified in `test-management.test.ts`, not just
by hiding buttons).

## Tests

`npm test` — 103 tests across 11 files (was 85 across 10). New in this
phase, `tests/integration/test-management.test.ts` (18 tests):

- Test creation/editing: Super Admin can create/edit a DRAFT test;
  Admin cannot create a test; editing is rejected once PUBLISHED;
  publishing with zero published questions is rejected; Admin cannot
  publish.
- Question authoring: create/edit a question; reject zero or two correct
  options; Admin cannot create/edit/delete/reorder/publish a question;
  delete allowed while DRAFT, rejected once the test is PUBLISHED;
  reorder renumbers 1..N and rejects a mismatched id set; the
  `publishQuestion` regression test described above.
- Placement bands: Super Admin can create/update/delete a band; a band
  with `minPercentage > maxPercentage` is rejected; Admin cannot create/
  update/delete a band.

Pre-existing suites (Phase 1/2A/2B) were not modified.

## Browser verification

Driven in a real headless Chromium browser (temporary, isolated
Playwright install — not a project dependency, same approach as prior
phases) against the **live Supabase-backed dev database** (the running
`next dev` server has no local-Postgres override), using two throwaway
accounts (one Super Admin, one Admin) created directly via a temporary
script and deleted afterward, plus one throwaway test/questions/band
created and deleted through the UI/DB. This departs from Phase 2B's
"local database" verification because this project's `next dev` now
connects directly to Supabase with no local override — confirmed with
the user before creating any data there, per the standing "keep the
existing Supabase setup unchanged" instruction (interpreted as
schema/config, not "never write a row"; no schema or config changed).

Confirmed end to end: Super Admin login → Tests list shows "New test" →
create a draft test → Questions page → add 3 questions with options and
metadata → publish all 3 → reorder (move first question down, order
changed) → delete one question (count dropped correctly) → add a
placement band → publish the test (requires ≥1 published question,
already satisfied) → "Add question" and edit/publish/delete controls
correctly disappear once the test is no longer DRAFT, replaced by a
read-only notice → mobile viewport (375px): no horizontal overflow on
either the test detail or questions page → logged in as the plain Admin
account and confirmed zero authoring controls render anywhere in this
area (no Archive, no Add band, no Add/Edit/Delete question) → zero
browser console errors across the run.

**This dev environment's Supabase-pooled connection is slow** (~2–5s per
mutating request, confirmed independently via a 15-call direct
service-layer stress test: 15/15 succeeded, no failures, just latency).
This surfaced as flakiness in the *verification script* itself early on
(a polling loop re-clicked before a prior click's effect had rendered,
piling up redundant requests) — rewritten to click once and wait
patiently instead. Not an application defect: `next build`, `tsc`,
`eslint`, and the full test suite are all clean, and every operation
this phase adds succeeded reliably once the script stopped racing ahead
of real network latency.

## Known limitations

- **No bulk/CSV question import** — out of scope for this phase per the
  brief ("do not import the real 70 questions yet"); questions are
  authored one at a time.
- **No drag-and-drop reordering** — up/down buttons only. Sufficient at
  the question counts this phase targets (a handful to dozens during
  authoring); revisit if that changes.
- **No question metadata analytics/aggregation view** — metadata is
  captured and stored; a dashboard over it is a future phase (see the
  brief's explicit "do not build analytics" instruction).
