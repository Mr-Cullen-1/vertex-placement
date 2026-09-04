# Phase 2E — Placement Scoring & Results

Status: complete. Builds on [PHASE_1.md](./PHASE_1.md) (scoring engine,
finalization pipeline) and [PHASE_2D.md](./PHASE_2D.md) (the imported
70-question test, and the open PlacementBand question it raised) without
redesigning either. **No schema/migration change was made or needed** —
inspected `PlacementResult`/`PlacementAttempt`/`PlacementAnswer` first;
every new value this phase needs is cheaply and reliably re-derivable
from existing persisted, immutable data, so nothing new is stored.

## Scoring formula

Unchanged from Phase 1 (`src/domain/scoring/engine.ts`, not touched this
phase): `score = correct answers`, `percentage = score / totalQuestions
* 100`, one point per correct answer, no weighting, no negative marking,
no difficulty weighting. `totalQuestions` is the test's actual published
question count (70 for the real imported test).

## Why not score-percentage progression bands

This is the central finding of the phase, carried over from Phase 2D's
open question and now resolved with a concrete, non-invented
implementation.

The source ("Language Hub Placement Test", Macmillan Education, 2019)
states **question-number ranges** mapped to course levels (1–6 →
Beginner, 7–20 → Elementary, …, 63–70 → Advanced), explicitly for
**teacher discretion**, with only a few non-linear illustrative score
examples (18/70 → "probably ready for Pre-Intermediate", 27/70 →
"second half of Pre-Intermediate", above 60 → "Advanced"). A literal
proportional translation of the question ranges into score-percentage
cutoffs contradicts the source's own examples — under that mapping,
18/70 (25.7%) falls in the Elementary band (10–28.57%), not
Pre-Intermediate as the source's own example states. This is proof, not
speculation, that "question range" and "score percentage" are different
axes here, and building a deterministic score→band formula would
misrepresent the source.

**Resolution implemented**: two separate, clearly-labeled concepts,
matching the brief's own "Product decision for MVP" section exactly:

1. **Score** (objective, deterministic): raw score, percentage,
   answered/correct/incorrect/unanswered counts. Unrelated to question
   order.
2. **Placement guidance** (descriptive, not certification): the
   **highest correctly-answered question number**, mapped through the
   source's own fixed six question-number ranges
   (`src/domain/placement/progression.ts`). This is exactly what the
   source states unambiguously — no score-to-band formula is invented
   anywhere.

The existing, optional, percentage-based `PlacementBand` mechanism
(Phase 1/2C) is **untouched and still available** — an admin can still
configure it for a test if they want a percentage-band label (shown as
`result.level`). It is a *separate* concept from the new progression
guidance and the two may agree or disagree; this is intentional (see
"Existing PlacementBand mechanism is unaffected" test). For the real
imported test, no `PlacementBand` rows are configured (per Phase 2D's
still-open decision), so `level` is `null` and only the new progression
guidance is shown.

## Result model

No new Prisma columns. New pure domain module
`src/domain/placement/progression.ts`:

- `PROGRESSION_BANDS` — the fixed six source ranges.
- `computeAnswerBreakdown(questions, answers)` → `{ answeredCount,
  correctCount, incorrectCount, unansweredCount,
  highestCorrectQuestionOrder, progressionBand }`. Pure, deterministic,
  never assumes a question was answered correctly because a later
  (harder) one was — every question is checked against its own recorded
  answer.

Computed **fresh on every read** (finalization, student re-visit, admin
view) from the same immutable inputs (`PlacementAnswer` rows,
`Question.order`, `Option.isCorrect`) rather than persisted — these
never change after a question is published (Phase 2C: content edits are
DRAFT-only) or after an attempt is submitted, so recomputation carries
zero staleness risk and avoids storing derived data the brief explicitly
said not to duplicate. `StudentResultSummary` and `AdminResultDetail`
(`src/domain/results/types.ts`) both gained a `progression: AnswerBreakdown`
field; `AdminResultDetail` additionally gained `startedAt`,
`completedAt`, and `isCanonical` (all pre-existing `PlacementAttempt`
columns, simply not previously exposed to this view).

## Unanswered handling

An unanswered question (`selectedOptionId` is `null`, or no
`PlacementAnswer` row exists at all — both treated identically) scores 0
points, counts toward `totalQuestions`, never errors, never blocks
finalization. Verified: 65 answered / 50 correct / 15 incorrect / 5
unanswered on a 70-question test produces score 50/70 (71.43%) — exactly
the section 7 example.

## Manual vs auto finalization

Unchanged: `finalizeAttempt` (`attempt.service.ts`) remains the one
shared pipeline for both triggers — this phase only adds the
progression computation alongside the existing scoring computation
inside it, using the same `questions`/`answers` already fetched there.
`StudentResultSummary` gained `autoSubmitted: boolean` (derived from the
existing `AttemptStatus`, not a new persisted field) so the student
result screen can show "Your test was submitted automatically when the
time limit was reached" without exposing internal status enum values.

## Student result screen

`src/components/placement/placement-result.tsx` — added, without
touching the existing score/topic sections:

- A "Recommended progression" card: the band label (or "Below Beginner"
  if nothing was answered correctly) plus a guidance sentence using the
  brief's exact required phrasing pattern ("Your result indicates that
  the X progression may be a suitable starting point" / a neutral
  teacher-review sentence when nothing was correct — never a defaulted
  "Beginner" claim).
- The fixed explanatory sentence from the brief, verbatim.
- Correct/Incorrect/Unanswered compact stats.
- The auto-submit note, shown only when `autoSubmitted` is true.

No confetti, no badges, no "Congratulations!!!", no CEFR/certification
language anywhere — verified both by code review and by a live browser
render (see "Browser verification"). No answer key, no per-question
detail, no correct-option text — `StudentResultSummary` structurally
cannot carry that (verified via `JSON.stringify` containing no
`isCorrect`/`correctOption` in both a fresh finalize response and a
later re-fetch).

## Admin result view

`src/app/admin/(dashboard)/results/[attemptId]/page.tsx` — extended:

- Score card: added answered/correct/incorrect/unanswered counts,
  submission type (relabeled from the existing SUBMITTED/AUTO_SUBMITTED
  status — not a new field), started/completed timestamps, canonical
  status, candidate email (if present).
- New **Placement guidance** card: highest correctly-answered question,
  and all six source bands listed with the candidate's band visually
  highlighted (a "Candidate" badge) — explicitly captioned "not an
  official CEFR placement... at the education center's discretion."
- Question analysis table: now distinguishes **Unanswered** from
  **Incorrect** (previously both rendered as a plain X) using the new
  `isAnswered` field, alongside the pre-existing text-based
  selected/correct-answer columns (never A/B/C/D labels, which would be
  meaningless given per-attempt option randomization).

## Security

Unchanged security boundary, explicitly re-verified this phase:
`StudentResultSummary` (used by every student-facing surface) carries no
`correctOptionText`/`isCorrect`/`questionAnalysis` field at the type
level — there's no code path that *could* leak it, not just a
convention. `AdminResultDetail` (Super Admin and Admin, both via the
existing `result:read` permission, unchanged RBAC) carries the full
per-question answer key. No new auth mechanism; no student-facing
route/action was touched beyond what already existed.

## Testing

`npm test` — 148 tests across 14 files (was 118 across 12). New:

- `tests/unit/progression.test.ts` (16 tests) — pure domain tests: all
  six band boundaries, no-gaps/no-overlaps coverage of 1–70, and cases
  A–I from the brief exactly (all-70-correct, zero-correct, 35/50
  correct with the right percentage, partial-with-unanswered,
  scattered-correctness "highest is the true max, not the count",
  and — the phase's most important terminology check — "highest
  correct question = 18" yields Elementary progression while
  `correctCount` is asserted to be 1, never confused with "score
  18/70".
- `tests/integration/scoring-results.test.ts` (14 tests) — full
  service-layer flows: all-correct/zero-correct/partial results with
  real DB persistence, exact 71.43% rounding, auto-submit via a real
  expired-deadline attempt (same pipeline, `autoSubmitted: true`),
  manual submit, canonical status exposed to admin, student cannot see
  the answer key (asserted on the serialized object, for both the
  initial response and a later re-fetch), admin sees full per-question
  analysis with accurate answered/unanswered splitting, option
  randomization doesn't corrupt scoring or the highest-correct-question
  calculation, a second submit attempt is rejected without creating a
  duplicate `PlacementResult` row, re-fetching a completed result
  returns byte-identical progression numbers, the persisted
  `PlacementResult` row matches the returned summary, and the old
  percentage-based `PlacementBand` (`level`) and the new progression
  guidance coexist without conflict.

New fixture: `createPublishedTestWithNQuestions(actor, count)`
(`tests/integration/fixtures.ts`) — the existing 4-question fixture only
spans the Beginner range (1–6), insufficient for testing progression
across all six bands.

Every pre-existing test suite (118 tests) still passes unmodified.

## Browser verification

Real Chromium, against the live Supabase-backed dev database (throwaway
accounts/tests/candidates created and fully cleaned up afterward,
confirmed with you before writing there — same pattern as Phases 2C/2D).

**Manual submit (10-question throwaway test, 6 correct / 3 incorrect / 1
unanswered by design)**: completed the flow as a student end to end
(Begin → candidate confirmation → instructions → answer questions →
submit), result screen showed exactly 6/10, 60%, "Recommended
progression: Beginner" with the correct guidance sentence, Correct 6 /
Incorrect 3 / Unanswered 1, no confetti/gamification/CEFR language, no
answer-key leakage. Revisiting the same (now completed) link renders the
identical result rather than restarting. Verified at 375px: no
horizontal overflow. Admin (both Super Admin and plain Admin) opened the
same result: score, submission type "Manual", started/completed/canonical
fields, all six progression bands with the candidate's band marked, the
question analysis table correctly distinguishing Correct/Incorrect/
Unanswered — verified at 375px too.

**Auto-submit (5-second-duration throwaway test)**: a real student
session started the attempt and the server auto-finalized it exactly at
the configured deadline (`startedAt` → `expiresAt` 5s later →
`submittedAt` shortly after, all real wall-clock timestamps, not
simulated) — `AUTO_SUBMITTED`, valid `PlacementResult` row, 0/5 (the
click landed after the window closed under this environment's network
latency — a property of the 5-second test configuration, not a defect;
confirmed independently via a direct service call producing a correct
6/10 result on the same pipeline for the manual-submit test). Reloading
the student link afterward correctly showed the "submitted automatically"
note, 0/5, 0%, and the neutral "no band" guidance (never a defaulted
"Beginner" claim) — screenshotted and visually confirmed calm/professional,
no gamification.

Zero browser console errors across every session.

**One environment characteristic investigated and disclosed, not an
application defect**: this dev environment's Supabase-pooled connection
has meaningful per-request latency (consistent with Phases 2C/2D's
findings) — a verification script's 30–40s waits were occasionally too
short for a full finalize round trip, and running multiple ad-hoc
debug/verification Node processes concurrently against the same pooled
connection caused visible contention. Diagnosed by calling the service
function directly (bypassing the browser/HTTP layer entirely), which
completed correctly and quickly once run in isolation — confirming the
application code itself was never at fault.

## Documentation of interpretation

Where the brief says "18/70 → probably ready for Pre-Intermediate," that
example describes a **score**, not a question-order position. This
phase's implementation never conflates the two: `computeAnswerBreakdown`
tracks `correctCount` (the score) and `highestCorrectQuestionOrder`
(the progression driver) as entirely independent values — see the
dedicated regression test "Case G" asserting `correctCount === 1` while
`highestCorrectQuestionOrder === 18` and the resulting band is
Elementary, specifically to prevent this exact misreading from ever
being reintroduced.

## Limitations / unresolved product decisions

- **`PlacementBand` (percentage-based) rows remain unconfigured for the
  real imported test** — this is Phase 2D's still-open decision, not
  something Phase 2E resolves; the new progression guidance is fully
  available regardless of whether that gets configured.
- **The student result's "Your strongest areas" topic block still
  renders "Unspecified"** for tests (including the real imported test)
  where no `QuestionMetadata.topic` was set — pre-existing Phase 1
  behavior (`topic ?? "Unspecified"` in the scoring engine), out of this
  phase's scope to change, and cosmetically minor (a single low-emphasis
  line), but worth flagging since it's visible on the real test's result
  screen today.
