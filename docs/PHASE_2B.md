# Phase 2B — Admin Experience

Status: complete. The first real Admin/Super Admin UI — login was already
wired in Phase 0/1, but `/admin` itself was a placeholder until now.
Builds on [PHASE_1.md](./PHASE_1.md) (services/RBAC/security model) and
[PHASE_2A.md](./PHASE_2A.md) (student flow, untouched) without redesigning
either. No schema/migration change was needed — every capability this
phase exposes was already backed by an existing Phase 1 service function.

## Implemented routes

```
/admin/login                       Sign-in (Phase 0, unchanged)
/admin                             Dashboard
/admin/tests                       Placement test list
/admin/tests/[id]                  Test detail — info, bands, assignments
/admin/candidates                  Candidate list + search
/admin/candidates/[id]             Candidate detail — info, assignments
/admin/assignments                 Assignment list
/admin/assignments/[id]            Assignment detail — invitation, attempts
/admin/results/[attemptId]         Full result detail (Admin-only view)
```

`/admin/login` sits outside the new `src/app/admin/(dashboard)/` route
group so it never gets the authenticated shell (sidebar/topbar); every
other route above lives inside that group and shares one layout. This
matches the route table already sketched in [ROUTES.md](./ROUTES.md),
plus `/admin/results/[attemptId]` (also already planned there) — no
unplanned routes were added.

## Admin shell

`src/components/admin/admin-shell.tsx` (Client Component) + `src/app/admin/(dashboard)/layout.tsx`
(Server Component — resolves the session, redirects to `/admin/login` if
missing, defense-in-depth alongside `src/proxy.ts`):

- Persistent dark sidebar (`--sidebar*` tokens) at `md`+, matching the
  Linear/Stripe-inspired admin direction — Vertex mark, four nav items
  (Dashboard/Tests/Candidates/Assignments, all reachable by both roles),
  user name/email/role, sign-out.
- Below `md`, an off-canvas drawer (topbar hamburger + slide-in panel,
  plain Tailwind + local state — no new dependency) instead of a
  squeezed sidebar.
- Navigation is **not** role-filtered — Tests is reachable by Admin too
  (read-only); Super-Admin-only *actions* are gated inside each page, not
  by hiding the nav item (see "RBAC").

## Dashboard

`/admin` computes four stat tiles — Candidates, Active assignments
(`PENDING`/`IN_PROGRESS`), Completed attempts, Available (published)
tests — and a "Recent activity" list, all from live `listPlacementTests`
/ `listCandidates` / `listAssignments` calls, no mock numbers. An empty
system shows a plain empty state with a link to add a candidate, per the
brief's explicit "do not invent fake analytics" rule.

## Tests

- List (`/admin/tests`): title, status badge, duration, question count
  (the test's declared `totalQuestionCount`), created date. "New test"
  (Super Admin only) opens a dialog that creates a **DRAFT test shell**
  (title/description/source attribution/duration/question count) via
  `createPlacementTestAction` → `createPlacementTest`.
- Detail (`/admin/tests/[id]`): test info, actual published-question
  count vs. declared count, placement bands (read-only list), and every
  assignment against this test. Super Admin sees Edit (DRAFT only),
  Publish, Archive — each a thin action calling the existing
  `updatePlacementTest`/`publishPlacementTest`/`archivePlacementTest`
  service functions; a domain error (e.g. "needs at least one published
  question") surfaces inline rather than crashing the page.
- Admin (non-Super) sees the same pages with zero authoring controls
  rendered — verified in browser testing (see "Browser verification").

**No question/option editor was built** — out of scope for this phase
(see "Known limitations"). A test created here has zero questions until
a future import pipeline adds them, so it stays DRAFT and un-publishable
until then; this is surfaced as an inline explanation, not a dead end.

## Candidates

- List (`/admin/candidates`): client-side search (name/phone/email
  substring — deliberately not server-driven filtering, per the brief's
  "do not over-engineer filtering") over a table showing name, phone,
  age, email, an assignment-count/completed-count summary, and created
  date. "New candidate" dialog validates with `candidateInputSchema`
  (`src/domain/candidate/schema.ts`) — the **same** schema the
  student-facing confirmation step (Phase 2A) validates against, not a
  second copy — before calling `createCandidateAction`.
- Detail (`/admin/candidates/[id]`): candidate info + every assignment
  for that candidate, with a shortcut into "New assignment" pre-filtered
  to this candidate.

## Assignment + invitation

`NewAssignmentDialog` implements the flow from the brief exactly:
Candidate (existing, picked from a list — or a new one, same shared
schema) + Test (only **PUBLISHED** tests are offered, since
`createAssignment` rejects anything else) → `createAssignmentAction` →
redirect straight to the new assignment's detail page.

`InvitationPanel` (`src/components/admin/assignments/invitation-panel.tsx`)
implements generate/copy/regenerate/revoke against the unchanged Phase 1
`invitation.service.ts`:

- **The plaintext token exists only in this component's local React
  state**, populated directly from the `generateInvitationAction`/
  `regenerateInvitationAction` result, immediately after a successful
  call. It is never persisted (unchanged Phase 1 design — only the hash
  is stored) and the panel is never handed a `tokenHash` prop in the
  first place — the assignment detail page explicitly maps each
  invitation row down to `{ id, status, createdAt, usedAt }` before
  passing it to any Client Component, specifically so the Prisma
  `tokenHash` column can never cross the server/client boundary, even
  as unused/unreferenced data in a serialized prop.
- Generated URL follows `/placement/{token}` exactly — built client-side
  from `window.location.origin` + the returned plaintext, nothing new
  invented.
- Regenerate/Revoke call the existing `regenerateInvitation`/
  `revokeInvitation` services unchanged — "regenerate is not a retake"
  and "single active invitation" continue to be enforced entirely
  server-side (Phase 1's partial unique index +
  `InvitationAlreadyActiveError`), not by client logic.
- Revoke requires an explicit confirmation dialog (destructive action).
- Invitation history (status + timestamps only) renders below, oldest
  action last used, newest visible first.
- **Fixed during browser verification, not part of the original plan:**
  once an assignment reaches `COMPLETED`, the panel now hides "Generate
  invitation" and shows an explanatory line instead of offering the
  button. The underlying `generateInvitation` service does **not** itself
  block issuing a new invitation for a completed assignment — the schema
  already anticipates future multi-attempt/retake support
  (`PlacementAttempt.isCanonical`), so that's deliberately not something
  this phase changes in the service layer. But without a UI guard, an
  Admin could accidentally open a second, unsupported attempt on an
  already-finished assignment through a path this phase never designed
  or tested (no retake UI exists yet). The fix is presentation-only —
  found by literally driving the flow start-to-finish in a browser, not
  by inspection.

## Results

`/admin/results/[attemptId]` renders `getAdminResultDetail` (unchanged
Phase 1 service, `result:read` — both roles) in full: score, percentage,
placement band, completion time/status, candidate info, difficulty
progression, topic performance, and a full per-question table **including
the correct answer and the candidate's selected answer** — this is the
one screen in the whole product that shows the answer key, by design
(the Phase 1 `StudentResultSummary` type the student-facing screen uses
structurally cannot carry this; `AdminResultDetail` is a separate type
for exactly this reason). Reached only from an assignment's "Attempts"
list, and only for a `SUBMITTED`/`AUTO_SUBMITTED` attempt.

## RBAC / security

Nothing about the Phase 1 authorization model changed — this phase is UI
on top of it, plus five new/reorganized thin Server Action files
(`test-actions.ts`, `candidate-actions.ts`, `assignment-actions.ts`,
`invitation-actions.ts`, `auth-actions.ts`, replacing the old
placeholder `admin-actions.ts`). Every action resolves its actor from
`getActorOrThrow()` (the session) — **never** from anything the client
sends — and calls the exact same service function the Phase 1 test
suite already exercises; `runAction()` (Phase 2A's pattern) wraps all of
them so a `ForbiddenError` reaches the UI as a stable `{ ok:false, code:
"FORBIDDEN" }` instead of a generic thrown error.

| Rule | Enforcement |
| --- | --- |
| Admin cannot author/publish/archive/edit tests, questions, or bands | `test:write`/`question:write`/`band:write` remain Super-Admin-only in `src/server/rbac.ts` (unchanged); the Tests UI additionally never renders those controls for an Admin session, but a direct action call would still be rejected server-side (verified: `tests/integration/authorization.test.ts`, pre-existing, still passing unmodified) |
| Admin can manage candidates/assignments/invitations/results | `assignment:write`/`invitation:write`/`candidate:read`/`result:read` — unchanged, both roles |
| Invitation token hash never reaches the client | See "Assignment + invitation" above — enforced by never including `tokenHash` in any prop passed to a `"use client"` component, not by hoping nothing reads it |
| No client-supplied attempt/candidate/invitation ID is trusted for authorization | Every mutating action still takes only IDs the Admin is already looking at on an authenticated, server-rendered page; the service layer independently re-validates existence/ownership/state (all pre-existing Phase 1 behavior) |
| No client-supplied timer/duration values | Unchanged from Phase 1/2A — nothing in this phase touches attempt timing |
| Route protection | `src/proxy.ts` (unchanged) redirects unauthenticated `/admin/*` requests; the new `(dashboard)` layout adds a second, redundant session check for direct Server Component rendering |

## Responsive design

Verified at 1440px (desktop), and 375px (mobile) — see "Browser
verification". Lists use a horizontally-scrolling `<table>` rather than
a second card-based layout (matches `/docs/DESIGN_SYSTEM.md`: "tables
scroll horizontally rather than compressing illegibly"); the sidebar
collapses to an off-canvas drawer below `md`; dialogs/forms stack to a
single column at narrow widths (native `<select>`/`<input>` elements,
no fixed-width layout assumptions).

## UX quality

Every list/detail route has a matching `loading.tsx` (skeleton, reusing
two small shared components — `ListSkeleton`/`DetailSkeleton`) so
navigation never shows a blank page while the Server Component fetches;
a shared `(dashboard)/error.tsx` catches unexpected failures with a
retry button; a shared `(dashboard)/not-found.tsx` handles an
invalid/unauthorized id via `notFound()`. Every list has a plain, quiet
empty state (no illustrations, per the design system). Destructive
actions (archive a test, revoke an invitation) require an explicit
confirm dialog. Mutating buttons disable and relabel (`"Creating…"`,
`"Publishing…"`, etc.) while pending.

## Architecture

UI → Server Action (`runAction` + `getActorOrThrow`) → existing Phase 1
service → Prisma, unchanged. Read-heavy pages (every list/detail route)
call the service layer **directly from the Server Component** — the
same pattern Phase 2A's `/placement/[token]/page.tsx` already
established — rather than round-tripping through a Server Action, since
a Server Component can call server-only code with no network hop.
Mutations always go through `runAction`. No new state-management library,
no new runtime dependency — five small UI primitives were hand-authored
in the existing `shadcn/ui`-on-`base-ui` style already used by
`button.tsx`/`dialog.tsx`/etc.: `table.tsx`, `textarea.tsx`,
`skeleton.tsx`, `select.tsx` (a styled native `<select>` — no popup
listbox, the option counts here don't warrant one), and two new `Badge`
variants (`success`/`warning`, using the `--success`/`--warning` tokens
`globals.css` already defined but nothing had used yet).

## Testing

`npm test` — 85 tests across 10 files (was 78 across 9). New in this
phase, `tests/integration/admin-workflow.test.ts`:

- Candidate service: Admin and Super Admin can both create/read/list
  candidates; a non-existent id throws `CandidateNotFoundError`.
- Admin result detail: both roles can read a completed attempt's full
  detail (including that `correctOptionText` is populated — the
  answer-key exposure this phase's UI relies on); an in-progress
  attempt (no result yet) and a nonexistent attempt id both throw
  `AttemptNotFoundError`.

Pre-existing invitation-lifecycle tests
(`tests/integration/invitation-lifecycle.test.ts`) already covered
regenerate/revoke end to end and were not touched. No existing test was
modified or weakened.

## Browser verification

Driven in a real headless Chromium browser (temporary, isolated
Playwright install — not a project dependency, same approach as Phase
2A) against the local development database, with two throwaway
accounts (one Super Admin, one Admin) created directly in the local DB
and deleted afterward, plus one throwaway test/candidate/assignment
created and deleted through the UI itself. Never touched Supabase.

Confirmed end to end: login → dashboard (live counts) → create a draft
test → confirm the "can't publish, no questions yet" message → create a
candidate → create an assignment against the published DEV-SAMPLE test
→ generate an invitation, copy the shown-once link → regenerate (old
link invalidated, new one shown) → open the link as a student in a
separate browser context and complete the full 8-question test → back
in Admin, open the resulting attempt's result detail and confirm the
question-by-question answer key renders → mobile viewport (375px): no
horizontal scroll, hamburger opens the drawer, dashboard/tests list
readable → logged in as the plain Admin account and confirmed "New
test" and Edit/Publish/Archive are absent from both the Tests list and
a test's detail page. Zero browser console errors across the run.

**One real bug found and fixed during this pass**, not caught by
type-checking or the test suite: the invitation panel offered "Generate
invitation" even for a `COMPLETED` assignment (see "Assignment +
invitation" above for the fix and why it was left as a UI-only guard).

**One cosmetic non-issue investigated and ruled out:** two `isVisible()`
checks in the verification script initially returned `false` right after
a fresh navigation; re-checked with explicit waits and directly-dumped
HTML, and confirmed the actual page content (dashboard heading, the
"no published questions" notice) was present and correct all along —
the false reads were the verification script racing ahead of Next.js's
streamed response on a route's first compile in dev mode, not an
application defect.

## Known limitations

- **No question/option authoring or import UI** — explicitly out of
  scope for this phase (see the brief's "do not build yet" list). A test
  created through `/admin/tests` has no content until a future import
  phase adds it.
- **Generating a new invitation for a `COMPLETED` assignment is blocked
  only in the UI**, not in `invitation.service.ts` itself — see
  "Assignment + invitation." A future retake feature should decide
  deliberately whether/how to allow this, rather than inheriting an
  accidental gap.
- **Candidate list/detail assignment counts are computed by fetching all
  assignments and filtering in the page**, not a dedicated filtered
  query — acceptable at the current/expected data scale (per the
  brief's "don't over-engineer" guidance for this phase); revisit if
  candidate/assignment counts grow large enough for this to matter.
- **No analytics/export/Telegram/aggregate dashboard views** — explicitly
  out of scope (see the brief's "do not build yet" list).
- **No automated accessibility audit tool was run** — manual review only
  (labeled form fields, focus-visible states from the existing
  `shadcn/ui` styles, confirm dialogs for destructive actions, `aria-current`
  on the active nav item). Flagged as a gap, not a guarantee, matching
  Phase 2A's note on the same topic.
