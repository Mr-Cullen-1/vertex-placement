# Phase 2A — Student Placement Flow

Status: complete. The full student-facing placement test experience — the
first UI built in this project. No admin dashboard, analytics, import,
Telegram, Excel export, or retake UI (see "Scope boundary"). Builds on
[PHASE_1.md](./PHASE_1.md) (backend/domain layer) and
[PHASE_1.md#phase-15--supabase-connection](./PHASE_1.md#phase-15--supabase-connection)
(database connection) without redesigning either.

## Implemented student flow

```
/placement/{token}
  -> Welcome (PlacementStart)
  -> Candidate confirmation (CandidateForm)
  -> Instructions (PlacementInstructions)
  -> Test (PlacementTestShell: timer, navigator, question, submit)
  -> Result (PlacementResult)
```

All five phases live under the **one** route — see "Routes" below for why.
A fresh token starts at Welcome; a token with an attempt already
`IN_PROGRESS` skips straight to Test (refresh-safe, see "Answer
persistence & resume"); a token whose invitation is `USED` goes straight
to Result, replaying the stored score rather than re-running the wizard;
an invalid/revoked token or an unpublished test shows a dedicated error
state. None of this is client-side guessing — the server resolves which
phase to show (`getPlacementStatus`, see "Server/client boundary") before
any interactive UI renders.

## Routes

Only one route changed from Phase 1's placeholder:

| Route | Change |
| --- | --- |
| `/placement/[token]` | Was a static placeholder; now a Server Component that resolves status server-side and hands off to a Client Component (`PlacementFlow`) that owns all phase transitions. No sub-routes (`/start`, `/test`, `/result`) — see below. |

**Why one route instead of the `/start` / `/test` / `/result` sub-routes
sketched in [ROUTES.md](./ROUTES.md):** those were written before an
attempt existed to resume. Phase transitions here are inherently
stateful and mid-flight (a candidate-info edit that hasn't been submitted
yet, a question index within an in-progress attempt) — modeling them as
separate URLs would mean either duplicating the "what state is this
token in" resolution at every route or synchronizing router state with
attempt state by hand. A single route with client-managed phases avoids
both, and matches the actual security/UX model: **the token is the only
address the student needs**, never an attempt ID or a phase name in the
URL (see /docs/PHASE_1.md "attempt IDs are not a credential" — the same
principle argued against putting attempt state in the URL at all). Admin
routes are unaffected and still match ROUTES.md as written.

## Components

All under `src/components/placement/`:

| Component | Role |
| --- | --- |
| `PlacementFlow` | Client orchestrator — owns phase state, renders the component for the current phase |
| `PlacementStart` | Welcome screen |
| `CandidateForm` | Candidate confirmation step (see "Candidate confirmation step" below) |
| `PlacementInstructions` | Rules screen before the attempt is created |
| `PlacementTestShell` | Owns the question list, current index, timer, navigator, submit dialog |
| `PlacementQuestion` / `AnswerOption` | One question's prompt + its answer cards (`role="radiogroup"`/`role="radio"`) |
| `QuestionNavigator` | Answered/unanswered/current grid, never blocks navigation |
| `PlacementTimer` | Client-side countdown display — see "Timer behavior" |
| `SubmitConfirmation` | Confirm-before-submit dialog, with inline retry on transient failure |
| `PlacementResult` | Final result — see "What the result screen shows" |
| `PlacementErrorState` / `PlacementLoading` | Shared edge-state screens |
| `VertexMark` / `VertexWordmark` | Inline SVG brand mark (see "Design notes") |

## Server/client boundary

- `src/app/placement/[token]/page.tsx` — **Server Component.** Calls
  `getPlacementStatus` (the service) directly, not through a Server
  Action — a Server Component can call server-only code without a
  network round-trip; Server Actions exist for *client-triggered*
  mutations. This is also why the very first render has no client-side
  loading flash for the common case (a fresh link).
- `src/server/actions/attempt-actions.ts` — the **only** interface
  Client Components use to reach the domain/service layer. Every
  function takes the invitation token (never an attemptId — see
  /docs/PHASE_1.md "Security review"). Two additions since Phase 1:
  `getPlacementStatusAction` and `updateCandidateAction`.
- `src/domain/candidate/schema.ts` — new in this phase. The candidate
  validation Zod schema moved out of `candidate.service.ts` (server-only,
  imports `@/lib/db`) into `domain/` specifically so `CandidateForm` (a
  Client Component) can import and run the *same* validation client-side
  without bundling server code into the browser. `candidate.service.ts`
  and `invitation.service.ts` both import it now instead of each
  defining their own copy.
- **No component queries Prisma or imports a `service.ts` file
  directly.** Every mutation/read from a Client Component goes through
  `attempt-actions.ts`.

## API / Server Action contracts

`src/server/actions/action-result.ts` (new): every student-facing action
returns

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };
```

instead of throwing. Server Actions serialize thrown errors back to the
client as plain `Error` objects — the `DomainError` subclass identity
(and its stable `code`) is lost across that boundary, leaving only
`.message` to branch on, which is fragile and easy to get wrong in a UI
that needs to distinguish "expired" from "not found" from "already used."
`runAction()` wraps every action body, catches `DomainError` and returns
`{ ok: false, code, message }` (the same `code`/`message` the service
layer already defined in Phase 1 — nothing new invented here), and
collapses anything else (a real bug, an unexpected exception) to a
generic `SERVER_ERROR` — **never** a raw Prisma/Postgres message. This
is additive to `src/server/services/attempt.service.ts`'s existing
throwing functions; the services themselves are unchanged in that
respect.

Actions, all token-based:

| Action | Wraps | Used by |
| --- | --- | --- |
| `getPlacementStatusAction` | `getPlacementStatus` (new) | `page.tsx` (initial), `PlacementTestShell` (recovery after an expired/finalized attempt is discovered) |
| `startOrResumeAttemptAction` | `startOrResumeAttempt` | `PlacementFlow` (instructions -> "Start test") |
| `getAttemptQuestionsAction` | `getAttemptQuestions` | `PlacementTestShell` on mount |
| `submitAnswerAction` | `submitAnswer` | `PlacementTestShell` on every option click |
| `submitAttemptAction` | `submitAttempt` | `PlacementTestShell` (manual submit + client-initiated auto-submit) |
| `updateCandidateAction` | `updateCandidateForToken` (new) | `CandidateForm` |

## New backend surface (additive, not a redesign)

Three small additions to the service layer, all following the exact
security/architecture pattern Phase 1 established (token-authorized, no
`Actor`, no direct DB access from UI):

- **`getPlacementStatus(token)`** (`attempt.service.ts`) — resolves which
  phase `/placement/{token}` should show *without* the side effect of
  creating an attempt. This matters: `startOrResumeAttempt` (Phase 1)
  creates an attempt (and starts its 30-minute clock) the moment it's
  called, which is correct for "the student clicked Start Test" but
  wrong for "checking what to render on page load" — the wizard
  (welcome/candidate-info/instructions) must not burn attempt time before
  the student has actually begun. An already-expired `IN_PROGRESS`
  attempt discovered here is still finalized (consistent with the
  Phase 1 on-access enforcement model) — status-checking is a read, but
  not a *passive* one when it uncovers an expired attempt.
- **`getCompletedResultForToken(token)`** (`attempt.service.ts`) — re-derives
  a student's own result from the persisted `PlacementResult` row.
  Never recomputes scoring (there is exactly one finalization pipeline;
  this only reads its output) — used so refreshing the result page, or
  revisiting a completed link, shows the real score instead of a dead
  end.
- **`updateCandidateForToken(token, input)`** (`invitation.service.ts`) —
  see "Candidate confirmation step" below.

`StudentResultSummary` (`domain/results/types.ts`) gained one field,
`candidateName`, populated from the `Candidate` row tied to the
assignment — needed so the result screen can greet the student by name
without any new admin-only data leaking through.

### Candidate confirmation step — a judgment call, flagged for review

The Phase 1 architecture requires a `Candidate` row to exist *before* an
assignment/invitation can be created (an Admin enters it — see
/docs/DATABASE.md). The product brief's student flow also describes a
"candidate information" step in `/placement/{token}` with real
validation and a real submission. Read literally, "the student submits
candidate info" and "the candidate already exists when the token is
issued" are in tension. Implemented `CandidateForm` as a **confirm/correct
step**: it's pre-filled from the existing `Candidate` row (whatever the
Admin entered) and "Continue" **updates** that same row via
`updateCandidateForToken`, rather than creating a new one. This required
zero schema changes and zero changes to how assignments/invitations are
created — only an additive, token-authorized update path. If the
product intent was instead a read-only confirmation with no write, or
something else entirely, that's a one-function change (drop the
`updateCandidateForToken` call, keep the pre-filled read) — flagged here
rather than silently guessed at, per the standing instruction not to
invent business rules.

## Timer behavior

`PlacementTimer` counts down from `expiresAt` (the server-issued
deadline from `PlacementAttempt.expiresAt`, returned by
`startOrResumeAttempt`/`getPlacementStatus`) — it recomputes
`expiresAt - Date.now()` every tick rather than decrementing a local
counter, so a throttled background tab or minor clock drift
self-corrects instead of compounding. States: normal, **warning** (≤5
minutes, `--warning` token), **critical** (≤60 seconds, `--destructive`
token, subtle pulse) — matching /docs/DESIGN_SYSTEM.md exactly. At zero,
it calls `onExpire` exactly once, which triggers `submitAttemptAction` —
**for UX only**. The component never computes or asserts the "real"
remaining time in any authoritative sense, and nothing about scoring or
finalization depends on it firing:

- Every attempt-touching action (`getAttemptQuestionsAction`,
  `submitAnswerAction`, `submitAttemptAction`, and `getPlacementStatus`
  on the next page load) independently re-checks `now >= expiresAt`
  server-side and finalizes the attempt right there if so — this is
  unchanged Phase 1 behavior (`autoFinalizeIfExpired`), not something
  this phase added.
- No action anywhere accepts a duration, elapsed time, or `expiresAt`
  value from the client. There is no code path — buggy or malicious —
  through which a client could extend the deadline. Verified directly:
  `tests/integration/placement-status.test.ts` asserts
  `PlacementAttempt.expiresAt` is byte-for-byte unchanged after repeated
  client interaction.
- Manual submit and expiry-triggered submit call the exact same
  `submitAttemptAction` -> `submitAttempt` -> `finalizeAttempt` chain —
  there has never been (Phase 1 or this phase) a second, separate
  auto-submit scoring path to keep in sync.

## Answer persistence & resume

Selecting an option updates local state optimistically, then calls
`submitAnswerAction` immediately (not debounced — a discrete selection,
not continuous input). On failure, the optimistic selection is **reverted**
and an inline error shown next to the current question — the student is
never told an answer saved when the backend rejected it (explicit
requirement). If the failure means the attempt just got finalized
(expired mid-interaction), `PlacementTestShell` recovers via
`getPlacementStatusAction` and transitions straight to the result screen
instead of leaving the student stuck.

Refresh/resume: a page reload re-runs `page.tsx`'s server-side
`getPlacementStatus` call, which returns `IN_PROGRESS` (with the original
`expiresAt` — never recomputed) whenever an attempt already exists, so
`PlacementFlow` renders straight into `PlacementTestShell`, which then
fetches the current question list — including every previously-saved
`selectedOptionId` and the **exact same** persisted option display order
(`PlacementAttempt.optionOrder`, set once at attempt creation in Phase 1;
this phase never touches it) — via `getAttemptQuestionsAction`. Nothing
is recreated, nothing is lost, the timer is not reset. A refresh
*before* an attempt exists (mid-wizard, i.e. during welcome/candidate-form/
instructions) simply restarts that wizard from the top — acceptable
since no attempt/timer exists yet to lose (see /docs/PHASE_1.md's Phase
0 approval of this exact tradeoff).

## Security review (this phase's additions)

Everything in Phase 1's security review
(/docs/PHASE_1.md "Security review") still holds unchanged — this phase
didn't touch RBAC, token hashing, or the finalization pipeline. What's
new here:

| Requirement | How it's met |
| --- | --- |
| Never expose answer keys / correct option IDs | `AttemptQuestionView` (Phase 1) never included `isCorrect`; verified directly in a new integration test (`never reveals which option is correct`) and again live in browser verification — DevTools/response payload inspection shows no correctness field. |
| Never allow arbitrary attempt access by ID | No UI component, action, or new service function accepts an attemptId from outside the module — unchanged from Phase 1, and now the *only* consumer (this phase's UI) is built to match: nothing client-side ever holds or sends an attemptId. |
| Never allow changing another candidate's attempt | Every action re-derives the attempt from the *hashed* token every call — a garbage/guessed token resolves to nothing (`tests/integration/placement-status.test.ts` "unauthorized attempt access"). |
| Never allow extending the timer | See "Timer behavior" above — no action accepts a time value at all. |
| Never allow submitting an already-finalized attempt | Unchanged Phase 1 guard (`DuplicateSubmissionError`, the atomic `status = IN_PROGRESS` conditional update); this phase's UI treats that response as "already done" and recovers the result rather than erroring. |
| Never allow reopening a completed invitation | `getPlacementStatus`/`startOrResumeAttempt` both go through `validateTokenAndLoad`, which rejects `USED` invitations — a completed link always resolves to the result screen, never back into the test. |
| Validate all client input server-side | `submitAnswerSchema` (Phase 1, unchanged) and `candidateInputSchema` (this phase) both run server-side inside the action, regardless of what client-side validation already did. |
| No sensitive logic in Client Components | Scoring, band matching, canonical-result determination, and finalization all remain exclusively in `attempt.service.ts`. Client Components only ever render what an action returned. |

## Error / edge states

`PlacementErrorState` maps stable `DomainError` codes (plus the
synthetic `TEST_UNAVAILABLE` status kind) to student-friendly copy —
never a raw Prisma/Postgres message. Covered: invalid token
(`INVITATION_NOT_FOUND`), revoked invitation (`INVITATION_REVOKED`),
reserved future expiry (`INVITATION_EXPIRED`), attempt not found, test
unavailable, and a generic `SERVER_ERROR` fallback for anything
unmapped. A completed invitation is **not** an error state — it routes to
the real result screen (see "Implemented student flow"). Failed answer
saves and failed submissions are handled inline (revert + retry) rather
than as full-page errors, so a transient network blip doesn't evict the
student from a test they were mid-way through — see "Answer persistence"
and `SubmitConfirmation`'s inline retry.

## Responsive behavior

Verified directly at 480px, 375px, and 1440px viewports (see "Manual UI
verification" in the completion report) — single column at every
breakpoint, answer cards stack vertically even on desktop (matches
/docs/DESIGN_SYSTEM.md: "horizontal grouping can make touch targets
ambiguous under time pressure"), the question navigator wraps onto
additional rows rather than overflowing horizontally, and the timer
stays visible in the header at every width tested.

## Design notes

Typography, spacing, card anatomy, and color usage follow
/docs/DESIGN_SYSTEM.md directly (violet `--primary` for the one CTA per
screen and selected-answer state, neutral surfaces otherwise, generous
whitespace, no gradients/glassmorphism/confetti). The brand mark
(`VertexMark`) is a small inline SVG recreation of the chevron in
`design/logo.png`/`DESIGN_REFERENCE.png` rather than an imported raster
asset — the source logo file is a white mark on a solid black square,
not usable as-is on the light student surface.

**A real, unrelated bug found and fixed during this phase's visual
verification:** `src/app/globals.css`'s `@theme inline` block mapped
`--font-sans: var(--font-sans)` — a circular/self-referencing custom
property left over from Phase 0's `shadcn init`, which never actually
resolved to the Geist font `next/font` loads (`--font-geist-sans`). It
silently fell back to the browser/OS default font (serif, on this
environment), on every screen, since Phase 0 — nothing before this phase
had rendered enough real text to make it visually obvious. Fixed to
`--font-sans: var(--font-geist-sans)`. One line; not a design-system
change, a bug fix restoring what the design system already specified.

## Testing

`npm test` — 78 tests across 9 files (was 56 across 7 after Phase 1.5),
all passing. New in this phase:

- `tests/unit/candidate-schema.test.ts` — the shared Zod schema
  (required fields, email format, age bounds, numeric-string coercion).
- `tests/integration/placement-status.test.ts` — `getPlacementStatus`
  for every kind (`NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`, including the
  auto-finalize-on-expiry path, plus that checking status never itself
  creates an attempt), `getCompletedResultForToken`,
  `updateCandidateForToken` (success, server-side validation rejection,
  invalid-token rejection), unauthorized access via a garbage token
  across every action, and that `expiresAt` cannot be altered by any
  client-reachable operation.

No existing test was modified or weakened.

## Manual UI verification

See the completion report for the full step-by-step results and the
tool used (a temporary, isolated Playwright installation — outside this
project's `package.json`, since no browser-automation tool was already
available in this environment and one isn't a project dependency here).
Summary: the entire flow (welcome -> candidate confirmation, including a
live validation-error check -> instructions -> question 1 -> answer,
navigate forward without answering, jump via the navigator, confirm an
earlier answer survived the jump -> submit confirmation showing the
real answered count -> result, with no answer-key/per-question content
-> reload the completed link and confirm it re-shows the result rather
than restarting -> an invalid token showing a friendly error) was driven
in a real headless Chromium browser against real backend data (a
DEV-SAMPLE-marked test, on the local dev database — never Supabase),
with zero browser console errors, and confirmed responsive at 1440px,
480px, and 375px.

## Known limitations

- **Candidate confirmation semantics** — see the flagged judgment call
  above; may need revisiting once the actual admin-side assignment
  workflow (Phase 2B+) clarifies how much candidate detail an Admin
  typically has on hand at invitation time.
- **No offline/optimistic-queue for answer saves** — a failed save is
  surfaced and reverted immediately, but there's no retry queue for a
  student on a flaky connection; they must reselect. Acceptable for MVP,
  worth revisiting if real usage shows it's a problem.
- **Question navigator is a plain wrapping grid**, not a
  collapsible/sheet UI on narrow screens — verified usable down to 375px
  (rows wrap, nothing overflows), but a very long question count (the
  real 70-question test, not yet imported) would produce a tall grid on
  mobile. Worth a compact/collapsed variant once real content exists to
  test against.
- **No automated accessibility audit tool was run** (e.g. axe) — manual
  review only (semantic radiogroup/radio roles, labeled form fields,
  visible focus states via the existing shadcn/ui focus-ring styles,
  threshold-only timer announcements). Flagged as a gap, not a
  guarantee.
- **The 70-question real Language Hub test is still not imported** —
  everything in this phase was exercised against the Phase 1
  DEVELOPMENT-ONLY 8-question fixture, per the explicit instruction not
  to invent or seed real production content.
