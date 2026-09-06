# Phase 2L — Raw-Score Recommendation, Final Placement, Student Detailed Analysis

Status: complete. Builds on [PHASE_2D.md](./PHASE_2D.md) and
[PHASE_2E.md](./PHASE_2E.md) (the source-fidelity finding that the
Language Hub source's question-number ranges must never be repurposed as
score-percentage thresholds) and the audit that immediately preceded this
phase (see git history / conversation — an evidence-gathering pass, no
code changed) which confirmed: the canonical resolver was already
correct and single-sourced, the P0 "question #70 makes a 4/70 result look
Advanced" bug was already fixed in Phase 2J, but the real Language Hub
test had **zero configured `PlacementBand` rows** — no institutional
score policy had ever been approved. This phase implements the approved
policy.

## Product decision

For the real 70-question Language Hub test, the official automated
recommendation is based **only** on total correct answers (raw score),
never on question position, difficulty, or an independently-derived
percentage threshold. Percentage remains a display/analytics value, never
the resolver for this policy.

## Approved Vertex institutional score bands

```
0–6    correct  ->  Beginner
7–17   correct  ->  Elementary
18–34  correct  ->  Pre-Intermediate
35–48  correct  ->  Intermediate
49–60  correct  ->  Upper Intermediate
61–70  correct  ->  Advanced
```

**These are Vertex's own institutional thresholds — NOT official
Macmillan score cutoffs.** The source gives only a few non-linear
illustrative score examples (18/70 -> "probably ready for
Pre-Intermediate", 27/70 -> "second half of Pre-Intermediate", above 60
-> "Advanced"), not a complete six-band cutoff table (see PHASE_2D.md/
PHASE_2E.md for the full analysis proving a literal proportional
derivation would misrepresent the source). This policy is disclosed as
such everywhere it's configured or documented — never presented as if
Macmillan itself defined these six exact cutoffs.

Configured via `src/server/services/language-hub-scoring.service.ts`'s
`applyLanguageHubInstitutionalBands` (idempotent — see "Historical
results backfill" below), which creates these as `RAW_SCORE`-mode
`PlacementBand` rows, exclusively on the one test titled exactly
"Language Hub Placement Test".

## Data model / policy type

Audited before changing: `PlacementBand` was percentage-only
(`minPercentage`/`maxPercentage: Float`, both non-nullable). Added
(migration `20260906172958_raw_score_bands_and_final_placement`,
additive/non-destructive):

- `scoringMode: PlacementBandScoringMode` (`PERCENTAGE` | `RAW_SCORE`),
  `@default(PERCENTAGE)` — every pre-existing band row is unambiguously
  PERCENTAGE, matching its actual historical meaning exactly.
- `minRawScore`/`maxRawScore: Int?` — populated only for `RAW_SCORE`
  bands.
- `minPercentage`/`maxPercentage` relaxed to nullable (`Float?`) — a
  `RAW_SCORE` band simply doesn't set them; no hidden conversion, no
  sentinel values.

No band ever converts between the two — `matchPlacementBand`
(`src/domain/scoring/engine.ts`) checks each band's own `scoringMode` and
compares against `rawScore` XOR `percentage` accordingly, never both.
Existing generic/custom tests (dev sample test, every test fixture) keep
working completely unchanged — they're all implicitly `PERCENTAGE`,
which is exactly what they were before this phase.

`src/server/services/placement-band.service.ts`'s Zod schemas gained
`scoringMode` (defaults to `PERCENTAGE`) and the new raw-score fields,
with a `superRefine` requiring the correct pair (`minRawScore`/
`maxRawScore` for `RAW_SCORE`, `minPercentage`/`maxPercentage` for
`PERCENTAGE`) — never both, never neither. `CreateBandInput` is typed via
`z.input` (not `z.infer`/output) specifically so `scoringMode` stays
optional at every pre-existing call site.

`PlacementResult` gained (same migration) `finalPlacementLabel: String?`,
`finalPlacementSetByUserId: String?` (FK to `User`), `finalPlacementSetAt:
DateTime?` — see "Final Placement" below. No existing column was
altered, removed, or had its meaning changed.

## Canonical raw-score resolver

`src/domain/scoring/engine.ts`: `matchPlacementBand(rawScoreValue,
percentage, bands)` — was previously `matchPlacementBand(percentage,
bands)`. Now takes both values and, per band, branches on that band's own
`scoringMode`:

```
RAW_SCORE  -> rawScoreValue >= band.minRawScore && rawScoreValue <= band.maxRawScore
PERCENTAGE -> percentage    >= band.minPercentage && percentage <= band.maxPercentage
```

Still exactly ONE resolver, exactly one call site
(`attempt.service.ts`'s `finalizeAttempt`), exactly one persisted
snapshot (`PlacementResult.placementBandId`) — this phase changed the
resolver's internals, never its architecture or its callers' contract.
Verified with a dedicated unit test that a `RAW_SCORE` band with
deliberately-matching `minPercentage`/`maxPercentage` fields set (as if
stale/leftover) still never matches on percentage — proving there's no
fallback path.

## Test-specific policy

`applyLanguageHubInstitutionalBands` only ever looks up and modifies the
ONE test titled exactly "Language Hub Placement Test" (the same lookup
Phase 2D's import used). Every other test's bands and results are
untouched — verified directly (a sibling PERCENTAGE-mode fixture test's
bands and results are asserted byte-identical after running the Language
Hub backfill). Nothing in the scoring architecture assumes RAW_SCORE or
these specific six labels globally; a different test can be configured
with `PERCENTAGE` bands, `RAW_SCORE` bands with entirely different
ranges/labels, or no bands at all, same as before this phase.

## Terminology: "Recommended Level"

Every student-facing surface (`placement-result.tsx`,
`detailed-analysis.tsx`) now labels `result.level` as **"Recommended
Level"**, not an unqualified "Level" — signaling it's an automated
recommendation, not an immutable academic placement decision. The field
itself is still named `level` internally (renaming every consumer would
be unrelated churn); only the display label changed.

## Final Placement

A SEPARATE, administrative decision (`PlacementResult.finalPlacementLabel`
+ `finalPlacementSetByUserId` + `finalPlacementSetAt`), edited via
`setFinalPlacement` (`attempt.service.ts`, gated on the new `result:write`
permission — granted to both `ADMIN` and `SUPER_ADMIN`, see
`src/server/rbac.ts`) and its Server Action
(`src/server/actions/result-actions.ts`). `label: null` clears an existing
override (`isOverridden` reverts to `false`, display falls back to the
Recommended Level). Setting it **never** touches `rawScore`, `percentage`,
or `placementBandId` — verified directly (before/after snapshot
comparison in `tests/integration/final-placement.test.ts`). The allowed
override values are the six standard Vertex placement levels
(`src/domain/placement/levels.ts`'s `STANDARD_PLACEMENT_LEVELS`, shared
with — but conceptually independent of — the progression module's
`PROGRESSION_BANDS` labels); an out-of-set label is rejected
(`InvalidPlacementLevelError`).

`FinalPlacementControl` (`src/components/admin/results/`) is the only UI
surface that can change it — a select of "Use Recommended Level" plus the
six levels, a Save button that only appears once the selection differs
from the current state, and an "Overridden by X on Y" disclosure when
applicable. **Never rendered on the student-facing result screen, and
never available for Try Yourself (self-service) candidates** — the
student's `StudentResultSummary` type has no Final Placement field at
all; it structurally cannot leak there.

## Student Detailed Analysis

A new collapsed-by-default section (`DetailedAnalysis`,
`src/components/placement/detailed-analysis.tsx`) on the existing student
result screen — no new page, no new route. See "Detailed analysis (Phase
2L)" in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for the visual/interaction
spec (the `Collapsible` primitive, nesting, animation).

**Performance by course level** (`computeCourseLevelPerformance`,
`src/domain/placement/course-level-performance.ts`) — reuses the same
fixed six question-number ranges as `PROGRESSION_BANDS`
(1–6 Beginner … 63–70 Advanced), but computes a full
correct/incorrect/unanswered/total breakdown per band rather than a
single "highest correct question" value. Purely diagnostic — a brand new
pure function, deliberately kept separate from `computeAnswerBreakdown`
(which stays exactly as it was) so the two outputs can never be
conflated. Never persisted; recomputed fresh on every read, same pattern
as the existing progression diagnostic.

**Strength/weakness summary** (`summarizeCourseLevelStrengthWeakness`) —
evidence-aware by design: a band only qualifies for the "strongest"/
"needs most improvement" comparison once at least 3 questions in it were
answered AND at least half of that band's questions were attempted. A
single lucky correct answer in a mostly-unattempted band (e.g. 1/1
Advanced attempted) never becomes "Strongest area: Advanced" — verified
directly with that exact scenario in
`tests/unit/course-level-performance.test.ts`. When only one band
qualifies, it's reported as the strongest and "weakest" stays null rather
than naming the same band as both.

**Question-by-question review** (`buildQuestionAnalysis` +
`toStudentQuestionReview`, `src/domain/results/question-analysis.ts`) — a
genuine, deliberate expansion of what a student can see: after
completion, a student may now review their own selected answer and the
correct answer for every question. This supersedes the earlier blanket
rule ("students never see the answer key") for this one specific,
authorized surface — gated entirely by *when* it's computed (only inside
the already-completed-attempt result-building path, itself reachable only
via the student's own token/session-verified access, per the existing
security boundary — never before an attempt is finalized, never for
another candidate's attempt). No internal database IDs are exposed;
`order` (already shown throughout the test itself) is the only
identifier. `buildQuestionAnalysis` is now the ONE shared computation
behind both the admin's full question analysis (with `topic`/
`difficultyBand`/`questionId`) and the student's narrower view (via
`toStudentQuestionReview`, which strips those admin-only fields) — not
two separate implementations.

**Coverage warning**: `StudentDetailedAnalysis.limitedCoverage` is true
once less than half the test was actually answered — a neutral UI
disclosure only ("Your result is based on limited coverage of the
test."), never a change to the Recommended Level algorithm.

## Admin result UI

`src/app/admin/(dashboard)/results/[attemptId]/page.tsx` restructured
into three visually separated groups (see DESIGN_SYSTEM.md): **Objective
result** (Recommended Level, raw score, percentage, timestamps —
immutable), **Final Placement** (the new override control, its own
card), **Diagnostic analysis** (Question progression evidence — reworded
to say "Recommended Level" instead of "Placement band" — the new
Performance by course level card, Topic performance, Difficulty
progression). No visual mixing of the three, per the brief's explicit
requirement.

## Historical results backfill

`src/server/services/language-hub-scoring.service.ts`'s
`applyLanguageHubInstitutionalBands` — idempotent, safe to re-run:

1. If the real Language Hub test has zero configured bands, creates the
   six approved `RAW_SCORE` bands (skips entirely if any bands already
   exist — never silently overwrites an existing configuration).
2. Finds every `PlacementResult` on that test with `placementBandId ===
   null` and, for each, matches its already-persisted `rawScore` against
   the (now-existing) `RAW_SCORE` bands, setting `placementBandId` if a
   match is found.
3. Never touches `rawScore`, `percentage`, `difficultyProgression`,
   `topicPerformance`, `completionSeconds`, `computedAt`, or any
   `PlacementAnswer` row — verified directly (before/after equality
   assertions on every other field).
4. Never touches any other test's bands or results — verified directly
   (a sibling PERCENTAGE-mode fixture test's bands/results are
   byte-identical after running this).

Run against the real database via
`node scripts/apply-language-hub-institutional-bands.mjs` (a plain-Node
script duplicating this service's logic with raw Prisma calls, per this
repo's established `scripts/` convention for one-off database operations
— see the script's own header comment for why it doesn't import the
TS service directly). **Result of the real run**: see this phase's final
report — the previously-`null` historical results (including the 4/70
case) now carry `placementBandId` -> **Beginner**, never Advanced.

## Try Yourself consistency

Verified (not assumed) that the public self-service flow uses the
identical resolver: `tests/integration/self-serve-language-hub-scoring.test.ts`
runs three real self-service attempts (18/70, 27/70, 61/70) against a
70-question test configured with the same `RAW_SCORE` Vertex bands, and
asserts the admin-read `level` for the same attempt is byte-identical.
No parallel Try Yourself scoring implementation exists —
`self-serve.service.ts` has no scoring code of its own; it calls the same
`attempt.service.ts` functions as the admin-assigned flow.

## Testing

New/changed test files:

- `tests/unit/scoring.test.ts` — extended with a `RAW_SCORE` describe
  block: matches on raw score even when percentage would suggest a
  different band, and a dedicated non-fallback proof (a `RAW_SCORE` band
  with stale-but-matching percentage fields never matches on them).
- `tests/integration/placement-level-boundaries-raw-score.test.ts` — the
  full P0 boundary matrix (0, 6/7, 17/18, 34, 35, 48/49, 60/61, 70) plus
  the question-identity regression (Q70-only vs Q1-6-only, both 4
  correct, both resolve to Beginner) against the real approved bands.
- `tests/integration/language-hub-scoring-policy.test.ts` — the backfill
  service: band creation, idempotency, the exact historical-4/70-to-
  Beginner case, isolation from unrelated tests.
- `tests/integration/final-placement.test.ts` — override/clear, RBAC (both
  roles), rejection of a non-standard label, never mutates rawScore/level.
- `tests/integration/self-serve-language-hub-scoring.test.ts` — Try
  Yourself resolver consistency (see above).
- `tests/unit/course-level-performance.test.ts` — pure-function coverage
  of the breakdown and the evidence-aware strength/weakness rule.
- `tests/unit/question-analysis.test.ts` — the shared admin/student
  question-analysis builder and the student-safe narrowing function.

Every pre-existing test still passes unmodified in behavior (two
pre-existing heavy `it()` blocks with an internal loop of full
70-question attempts were split into `it.each` cases purely for test
stability under this environment's real Supabase-pooled-connection
latency — same assertions, same coverage, no behavior change).

## Verification gate

TypeScript (`tsc --noEmit`), ESLint, `prisma validate`, the full test
suite, and `next build` — see this phase's final report for the actual
run results and the commit hash.

## What was NOT changed

Per the explicit brief: question answer keys, question order, the
30-minute test duration, autosave, timer semantics, the two-attempt Try
Yourself quota, OTP/email verification architecture, candidate ownership
flow, invitation lifecycle, admin RBAC beyond the one new `result:write`
permission, the landing-page design, and the Phase 2K no-horizontal-scroll
rule (the new Detailed Analysis UI was built to comply with it from the
start — flex/grid rows, no tables, verified at the required viewport
widths).
