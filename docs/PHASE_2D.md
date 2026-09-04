# Phase 2D — Import the Real Placement Test

Status: content import complete; **one open decision awaits your
approval before it's fully "done"** — see "Placement bands: an open
decision" below. Builds on [PHASE_1.md](./PHASE_1.md) (domain/import
contracts) and [PHASE_2C.md](./PHASE_2C.md) (Test Management UI) without
redesigning either. **No schema/migration change was made or needed.**
No RBAC change was made or needed (`import:write` already existed,
Super-Admin-only, unused until now).

## Source

`Language Hub Placement Test with key.pdf` — Macmillan Education, a
division of Springer Nature Limited, © Springer Nature Limited, 2019.
70 real questions (item 0 is the source's own worked example and is
excluded), 4 options each, answer key, and course-level progression
guidance for items 1–70.

## Import architecture

```
Verified source dataset (src/domain/import/sources/language-hub-2019.ts)
  -> validateNormalizedQuestions() (src/domain/import/validate.ts)
  -> previewLanguageHubImport()  (preview — no DB write)
  -> confirmLanguageHubImport()  (transactional persist)
```

**Not a general-purpose PDF parser**, and this is a deliberate finding,
not a shortcut: a PDF's text layer does not preserve an inline blank
("___") as an extractable character — it renders as a ruled line, not
text — so no automated text/layout extraction can recover blank
position from the raw PDF content. This is a structural limitation of
the format itself. `src/domain/import/sources/language-hub-2019.ts`
instead holds a manually-transcribed dataset for this one specific,
known source document, cross-checked twice: (1) a pure structural
self-check (70 questions, 280 options, exactly one correct option each,
answer letter for every question independently re-derived from context
and compared against the source's own printed answer key — all 70
matched), and (2) a full database-level re-audit after import (see
`npm test` and the source-integrity spot checks below) confirming every
question, option, and correct answer round-trips through Prisma
unchanged. `src/domain/import/types.ts`'s `NormalizedQuestion`/
`ImportPreview`/`ImportValidationIssue` contracts (from Phase 1) are
reused as-is; `QuestionParser`'s `parse(fileBuffer)` signature is not,
since there is no uploaded file in this flow (see "Source file handling"
below) — a future different source format would still go through the
same normalize → validate → preview → confirm stages.

There is **no file-upload UI**. `ImportLanguageHubDialog`
(`src/components/admin/tests/import-language-hub-dialog.tsx`) is a
single "Import Language Hub test" button on `/admin/tests` (Super Admin
only) that fetches a preview (title, duration, question count, source
bands, first 3 questions, validation status) and requires an explicit
"Confirm import" click — never auto-imports, never auto-publishes.

## Question metadata

- `difficultyBand`: the source's six course-level ranges (Beginner
  1–6, Elementary 7–20, Pre-Intermediate 21–34, Intermediate 35–48,
  Upper Intermediate 49–62, Advanced 63–70), stored per question.
- `sourceRef`: `"Language Hub Placement Test 2019 — Q{n}"` per question.
- `topic`: left empty. Grammar-topic classification isn't present in
  the source and would require linguistic judgment calls the brief
  explicitly said not to invent ("leave it empty rather than inventing
  it").
- `tags`: empty.

## Test record

One `PlacementTest`: title **"Language Hub Placement Test"**,
`sourceAttribution` "Language Hub Placement Test, Macmillan Education,
2019" (matches the schema's own documented example verbatim),
`durationSeconds` 1800 (30 min), `totalQuestionCount` 70, created
**DRAFT**. Imported questions are created `PUBLISHED` immediately (their
content is final/verified — publishing a *question* only makes it count
toward the test's own publish gate; a DRAFT *test* is never reachable by
a student regardless of its questions' status, per
`attempt.service.ts`), so a Super Admin can publish the whole test in
one click after reviewing rather than needing 70 individual
per-question publish actions. Re-running the import is safe: it checks
for an existing test with this exact title first and refuses (no
duplicate test, no duplicate questions) rather than silently creating a
second copy.

## Placement bands: an open decision — not resolved automatically

**No `PlacementBand` rows were created for this test.** This was a
deliberate stop, not an oversight, and needs your decision.

The source gives *question-number ranges* mapped to course levels
(e.g. "items 1–6 → Language Hub Beginner") explicitly for **teacher
discretion**, with only a few non-linear illustrative examples ("18/70
→ probably ready for Pre-Intermediate," "27/70 → second half of
Pre-Intermediate," "above 60 → Advanced"). The existing `PlacementBand`
schema, however, is `minPercentage`/`maxPercentage`-based, and the
existing scoring engine (`matchPlacementBand`) assigns a band
**automatically and deterministically** from a raw-score percentage —
no teacher judgment involved.

Translating the source's question ranges into percentages by simple
proportion (e.g. Beginner = items 1–6 → 0–8.57%) does **not** reproduce
the source's own examples: under that literal mapping, a score of 18/70
(25.7%) falls in the *Elementary* range (10–28.57%), but the source's
own example says 18/70 signals readiness for *Pre-Intermediate* — the
source's guidance is about "nearly through this band, ready for the
next one," not "this score IS this band." Populating `PlacementBand`
with a proportional approximation would mean inventing a score boundary
the source does not state, and would automate a decision the source
explicitly reserves for teacher discretion — both directly prohibited
by this phase's brief ("do NOT invent additional score boundaries," "do
NOT convert these examples into a fake deterministic CEFR scoring
table").

This is exactly the "if a schema/behavior mismatch is found, STOP and
report" case the brief asks for. Result today: `PlacementBand` is
configured for this test but empty — the existing Phase 2C UI (Test
detail → Placement bands) already handles that gracefully ("No scoring
bands configured — results will show a raw score without a level
label"), and Phase 2C's `BandsManager` lets a Super Admin add bands by
hand if you decide on a policy. Options, for you to choose from:

1. Leave bands unconfigured — every result shows a raw score/percentage
   only, no level label, until you decide.
2. Approve an explicit, disclosed proportional approximation (accepting
   that it won't exactly reproduce the source's illustrative examples).
3. Define your own institutional thresholds directly (via the existing
   Phase 2C band editor) — not derived from the source's ambiguous
   guidance at all.
4. A schema change to represent "readiness for next level" separately
   from "current score band" — would need to be scoped and approved
   separately; not attempted here.

## RBAC

Unchanged. `import:write` (Super Admin only) already existed in
`src/server/rbac.ts` from Phase 1 and gates both `previewLanguageHubImport`
and `confirmLanguageHubImport`. Admin has `test:read` (unchanged) — can
open and inspect the imported test/questions, cannot import, edit, or
publish; verified both server-side (RBAC test) and in a real browser
session.

## Source file handling

The PDF is never uploaded, stored, or read by the running application —
it was a one-time authoring reference for the verified constant in
`language-hub-2019.ts`. `ImportJob.fileRef` stores a stable identifier
string (`"language-hub-placement-test-2019"`), never a path/URL to an
actual file, satisfying "the application must operate entirely from the
imported database content after import."

## Transaction / timing note

`confirmLanguageHubImport` runs the whole persist (test + 70 questions +
280 options + 70 metadata rows + one `ImportJob`) inside one Prisma
interactive transaction, so a failed import leaves no partial data.
Prisma's default interactive-transaction timeout (5s) is far too short
for 70 sequential creates under this environment's per-request latency
(~2–5s to the Supabase-pooled connection) — the transaction was
explicitly given a 600s timeout / 20s connection-acquire wait
(`{ timeout: 600_000, maxWait: 20_000 }`). Without this, the transaction
aborted partway through and surfaced as a confusing foreign-key
violation on the *next* statement rather than a clear timeout — found
and fixed during this phase's verification (see "Browser verification").
A real import took ~2 minutes end to end in this environment.

## Testing

`npm test` — 118 tests across 12 files (was 103 across 11). New in this
phase, `tests/integration/import-language-hub.test.ts` (15 tests):
source-dataset structural integrity (count/order/options/answer
key/band assignment/Q0 exclusion, all pure — no DB), validator rejection
of deliberately broken inputs (wrong count, duplicate/missing order,
wrong option count, zero/two correct options), RBAC (Admin cannot
preview or confirm; Super Admin can), a full DB-level import producing
exactly 70 questions/280 options/DRAFT test/30 min duration, question
order 1..70 verified from the database, every answer key verified
against the database, re-import rejected without creating a duplicate,
and — reusing the *existing, unmodified* attempt/scoring machinery end
to end against the real imported content — per-attempt option-order
randomization still works and answering every question correctly yields
exactly 70/70 (100%).

## Source integrity — final audit

Machine-verified against the live database after import:

```
Questions: 70
Options: 280
Correct answers: 70
Question order: PASS
Answer key: PASS
Bands (question metadata difficultyBand): PASS
Duration: 30 min
Example Q0 excluded: PASS
Published automatically: NO (test created DRAFT; published once, deliberately, during browser verification — see below)
```

Representative questions spot-checked directly against the source PDF
across all six bands (1, 6, 7, 20, 21, 34, 35, 48, 49, 62, 63, 70) —
prompt, all 4 options, and correct answer confirmed matching.

## Browser verification

Driven in a real headless Chromium browser against the live
Supabase-backed dev database (confirmed with you before writing there,
same as Phase 2C), using two throwaway accounts created and deleted
afterward. **The imported test itself is real, not throwaway, and was
kept** — only the verification accounts and a throwaway
candidate/assignment/invitation were cleaned up.

Confirmed: Super Admin login → Tests list shows "Import Language Hub
test" → preview shows title/30 min/70 questions/six source bands/first
3 questions/"Validation passed" → confirm → redirected to the new test
(DRAFT) → Questions page lists all 70 → spot-checked Q1 (Beginner), a
mid-range item (~Q40, Intermediate), and Q70 (Advanced) render with
correct text → opened the edit dialog for Q1 and confirmed the
pre-selected correct option matches the answer key ("in") → Placement
bands section shows the empty state (see "open decision" above) →
mobile viewport (375px): no horizontal overflow → logged in as the
plain Admin account and confirmed it can open/inspect the test and
questions with zero Publish/Archive/Add-band/Edit/Add-question controls
rendered anywhere → zero browser console errors.

**Student flow**, run separately: the real test was published (there is
**no unpublish** in the current domain model — `placement-test.service.ts`
only supports DRAFT → PUBLISHED → ARCHIVED — so this was a deliberate,
disclosed, one-way action taken specifically because the brief asks to
verify the student experience "against the imported test," which
requires it to be live) → generated a throwaway invitation → welcome
screen shows the real title, 70 questions, 30 min, no PDF/publisher
references → candidate confirmation → instructions → test interface
shows question 1 ("Mr Davidson... London today") first, in source
order, a countdown timer is visible, an answer option can be selected
→ no source/PDF internals leaked anywhere in the flow → zero console
errors. The throwaway assignment/candidate/invitation used for this was
deleted afterward; the real test was left **PUBLISHED** as the natural
end state of a completed, verified import (see the "STOP condition" —
you can archive/manage it from here through the existing Test
Management UI same as any other test).

**One real bug found and fixed during this pass, not caught by
type-checking or the test suite**: the import transaction used Prisma's
default 5-second interactive-transaction timeout, which is far too
short for 70 sequential creates under this environment's latency — see
"Transaction / timing note" above.

## Known limitations

- **`PlacementBand` rows are not populated for this test** — see "an
  open decision" above; this is the one thing this phase did not
  resolve unilaterally, by design.
- **No general PDF import UI** — this import path is specific to this
  one known, verified source document (see "Import architecture").
  Importing a *different* source document would mean transcribing and
  verifying a new dataset the same way, not uploading a file.
- **No bulk/automatic answer-key OCR** — inherent to the source format
  (see "Import architecture"), not a shortcut taken for this phase.
