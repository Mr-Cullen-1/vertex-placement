# Phase 2F — Assignments, Invitations & Operational Flow

Status: complete. Builds on Phase 1 (assignment/invitation/candidate
services), [PHASE_2B.md](./PHASE_2B.md) (the first admin UI over them),
and [PHASE_2E.md](./PHASE_2E.md) (scoring/progression, reused as-is —
never duplicated) without redesigning any of them. **No schema/migration
change was made or needed.** No RBAC change was made or needed — every
permission this phase uses (`assignment:write`, `invitation:write`,
`candidate:read`, `result:read`, `export:standard`, `export:full`)
already existed from Phase 1, unused for export until now.

## Audit findings before writing code

Per this phase's explicit "audit first" instruction, the assignment/
invitation/candidate services, RBAC, and result pages were inspected
before any change (`assignment.service.ts`, `invitation.service.ts`,
`candidate.service.ts`, `attempt.service.ts`, `rbac.ts`, the existing
`/admin/assignments`, `/admin/candidates`, `/admin/results/[attemptId]`
pages, and `docs/ARCHITECTURE.md`/`DATABASE.md`/`PRODUCT_RULES.md`/
`PHASE_2C.md`/`PHASE_2D.md`/`PHASE_2E.md`). Conclusion: the core
operational flow (create assignment → candidate → generate/regenerate/
revoke invitation → student completes → admin views result) already
existed and worked, built across Phases 1/2A/2B. This phase's real work
was: (1) a genuine security gap found during the audit, fixed at the
service layer; (2) richer list views (status/invitation/score/
progression columns); (3) the Excel export, designed but never built
since Phase 1.

## A real gap found and fixed: regeneration/generation on a completed assignment

Phase 2B's own docs (`PHASE_2B.md` "Known limitations") already flagged
this: *"Generating a new invitation for a COMPLETED assignment is
blocked only in the UI, not in `invitation.service.ts` itself."* Tracing
it through: `generateInvitation` only checked for an existing **ACTIVE**
invitation before creating a new one — once an assignment is COMPLETED,
its invitation is `USED` (not ACTIVE), so the check passed anyway,
letting a brand-new ACTIVE invitation be issued for an already-finished
assignment. A student opening that link would trigger `createNewAttempt`
and produce a **second, real `PlacementAttempt` and `PlacementResult`**
(non-canonical, so the official result stays protected — but a spurious
second attempt would still exist, which is exactly "an unsupported
second attempt" this phase's brief says to prevent).

**Fixed at the service layer** (`invitation.service.ts`): both
`generateInvitation` and `regenerateInvitation` now check
`assignment.status === "COMPLETED"` up front and throw the new
`AssignmentAlreadyCompletedError` (`src/server/errors.ts`) before doing
anything else. `regenerateInvitation` was already *incidentally* safe
(no ACTIVE invitation exists to revoke once completed, so it fell
through to `InvitationNotFoundError`) — the explicit check makes the
real rule visible and gives a precise error message instead of relying
on that side effect. Regression-tested in
`assignment-invitation-flow.test.ts` ("J/K").

## Assignment flow

Unchanged: `createAssignment` (candidate + PUBLISHED test → one
`PlacementAssignment`), `generateInvitation`/`regenerateInvitation`/
`revokeInvitation` (ACTIVE/USED/REVOKED lifecycle, unique-ACTIVE-per-
assignment enforced at both the service and DB level — pre-existing,
re-verified this phase, not re-implemented).

## Invitation UX

Unchanged mechanics (`InvitationPanel`, Phase 2B): the plaintext token
lives only in client state, shown once, right after generate/regenerate.
The link is built client-side from `window.location.origin` — never a
hardcoded host, works identically in local dev and any deployed origin.

## Assignment status — derived, not a new persisted enum

Per this phase's explicit instruction ("prefer deriving status... avoid
duplicated state"), no new `AssignmentStatus` enum value was added.
`src/domain/placement/assignment-status.ts` (new, pure): given the raw
persisted `AssignmentStatus` plus whether the assignment currently has
any/an active invitation, derives a **display-only** status that adds
exactly one case the raw enum can't express: **Revoked** — a `PENDING`
assignment whose only invitation(s) were all revoked without ever
starting an attempt. Every admin page that previously rendered
`assignment.status` directly now renders `displayStatusForAssignment(...)`
instead (dashboard, assignment detail, candidate detail, test detail,
the Assignments list) — same badge component, one added case.

## Assignments page (`/admin/assignments`)

Columns extended to Candidate / Test / **Status** (derived) /
**Invitation** (most recent invitation's status, or "None") / **Score**
/ **Progression** / Created / **Actions**. Score and Progression reuse
`getCanonicalResultSummaryForAssignment` (new, in `attempt.service.ts`)
— a lean sibling of Phase 2E's `getAdminResultDetail` that calls the
exact same `computeAnswerBreakdown` pure function, just without the
per-question prompt/topic enrichment a list cell doesn't render. **Never
a second scoring/progression implementation.** Both columns show "—"
for assignments with no completed canonical attempt.

**Actions column is deliberately just "View" (+ "Result" once
completed), not inline Generate/Copy/Regenerate/Revoke.** This is a
security-driven choice, not an oversight: the plaintext invitation token
is never persisted and only exists in the admin's browser for the
seconds after generation — there is nothing to "copy" for an existing
invitation from a list row days later, and Regenerate/Revoke already
have proper confirmation dialogs on the assignment detail page, which
"View" reaches in one click. Cramming those into every list row would
either be non-functional (Copy, without a plaintext) or duplicate
already-correct detail-page UI for no real gain.

## Candidates page

Added **Status** (derived status of the candidate's most recent
assignment) and **Result** (score/percentage of their most recent
*completed* assignment) columns, alongside the existing name/phone/age/
email/assignment-count/created columns and client-side search — all
still MVP-lightweight, no new filtering infrastructure, no CRM features.

## Export (`ExportWorkbookButton`, `export.service.ts`)

Implements `src/domain/export/types.ts`'s `ExportSheetName`/
`WorkbookSpec` contract (fixed in Phase 1, never built) using the
**new** `exceljs` dependency (the one dependency this phase adds — no
Excel-writing capability existed; building a raw XLSX/OOXML writer from
scratch would be its own significant, error-prone project, so this is
the "implement the minimum required functionality" the brief
authorizes). One workbook, not one file per candidate:

- **Candidates**: name, phone, age, email, assignment (test title),
  created — one row per candidate, or one row per assignment for
  candidates with more than one.
- **Results**: candidate, test, score, total, percentage, **progression**
  (never a score-percentage-derived label — the same
  `progressionBand.label` Phase 2E computes, or "Below Beginner"),
  submission type, started/completed, canonical.
- **Topic Analysis**: candidate, test, topic, correct/total/percentage —
  "Unspecified" preserved as-is (Phase 1 behavior) when no topic
  metadata exists, never invented.
- **Question Analysis** (Super Admin only, matching
  `docs/ARCHITECTURE.md`'s already-decided design exactly): candidate,
  question #, selected answer, correct answer, Correct/Incorrect/
  Unanswered, difficulty band.

Every number in every sheet comes from `getAdminResultDetail` (Phase
2E) — one lookup per completed assignment's canonical attempt, reusing
the exact same computation the Result page shows. **No scoring or
progression logic exists a second time in the export code.**

Permissions: `assertPermission(actor, "export:standard")` gates the
whole export (Admin and Super Admin both have it); whether the Question
Analysis sheet is included is decided by `hasPermission(actor.role,
"export:full")` (Super Admin only) — both permissions pre-existed,
unused until this phase.

**Delivery mechanism**: a Server Action (`exportPlacementWorkbookAction`)
returns the workbook as base64; a small Client Component
(`ExportWorkbookButton`) decodes it into a `Blob` and triggers a normal
browser download. This follows the app's existing "Server Actions, not
a REST `/api/*` surface" convention (`docs/ROUTES.md`) rather than
adding a new route handler — no new route was created.

## Export security

- Every export call requires an authenticated `Actor` (from
  `getActorOrThrow()`, the same session-derived actor every other action
  uses) — there is no anonymous/token-based path into
  `export.service.ts`, and a student's invitation token has no
  permission in the RBAC matrix at all, so it structurally cannot reach
  this code.
- Admin never receives the Question Analysis sheet — verified by
  actually parsing the generated `.xlsx` buffer back with `exceljs` and
  asserting the sheet list, not just by code inspection.
- No `tokenHash`, invitation plaintext, or any auth/session field is
  ever read by `export.service.ts` — it only calls `listCandidates`/
  `listAssignments`/`getAdminResultDetail`, none of which expose those
  fields. Verified by scanning every cell of a generated workbook for a
  real `tokenHash` value and the string `"tokenhash"` — absent.

## RBAC

No changes. Verified (not just re-asserted) this phase: Admin can
create assignments, generate/regenerate/revoke invitations, read
candidates/results, and export the standard sheet set; Admin still
cannot create/edit a test, a question, or a scoring band (existing
boundary, re-tested here to confirm this phase didn't erode it); Super
Admin retains everything plus the full export.

## Testing

`npm test` — 172 tests across 16 files (was 148 across 14). New:

- `tests/unit/assignment-status.test.ts` (8 tests) — pure derivation
  logic: every raw-status passthrough case, the Revoked case, and the
  Prisma-shaped convenience wrapper.
- `tests/integration/assignment-invitation-flow.test.ts` (16 tests) —
  covers items A–S from the brief: assignment creation requires a
  PUBLISHED test, candidate validation, token hashing (asserts the
  actual persisted row — a real SHA-256 hex digest, never equal to the
  plaintext, plaintext absent from the serialized row entirely), Admin/
  Super Admin RBAC across the whole new surface, the completed-assignment
  regeneration/generation block (the fix above) with a DB-level
  assertion that no second attempt was created, regeneration revoking
  the old token while leaving the assignment/candidate/test untouched,
  export sheet-set-by-role (parsing the real generated workbook back),
  export content sanity (real data, not placeholders), export token-hash
  absence (scanning every cell), and the Assignments→Result link
  resolving the same `attemptId` the Phase 2E result page uses.
- One real bug caught by the test suite itself: the test's own
  `completeAssignment` helper picked the *displayed* first option
  (`view[i].options[0]`) rather than resolving the true correct option
  from the database — since option display order is randomized per
  attempt, this occasionally produced a 0/N score. Fixed to match the
  established safe pattern (Phase 2D/2E): always resolve the correct
  option from `Question.options.find(isCorrect)`, never by position in
  the shuffled view.

All 148 pre-existing tests still pass, unmodified.

## Browser verification

Real Chromium, against the live Supabase-backed dev database (throwaway
accounts/candidates/assignments, confirmed with you before writing
there, same as prior phases — cleaned up afterward; the real imported
Language Hub test itself was touched only to create one throwaway
assignment against it, never modified).

**Main flow**: logged in → opened Assignments → created a candidate and
an assignment against the **real, published Language Hub Placement
Test** (selected by its real name in the test picker) → generated an
invitation → opened the link as a student → confirmed the welcome
screen shows the real title and 70 questions → started the test →
returned to admin and confirmed the assignment shows **In Progress**.
For the full completion → **Completed** → result → export sequence, a
small throwaway 5-question test was used instead of scripting all 70
real questions (which would take many minutes of clicking with no
additional coverage — the same finalize/scoring pipeline is exercised
either way, and Phase 2D/2E's verification already drove the real
70-question content end to end) — completed the test, confirmed
**Completed** status, opened the result and confirmed score +
progression guidance render, then clicked **Export workbook** and
confirmed a real `.xlsx` file download.

**Regeneration**: created an assignment + invitation, regenerated it,
confirmed the new token differs from the old one, confirmed the **old
link is rejected** when opened, confirmed the **new link works** (shows
the welcome screen), and confirmed no attempt exists yet (regeneration
alone never starts one — same guarantee `assignment-invitation-flow.test.ts`
proves at the DB level for the completed-assignment case).

**Revocation**: created another assignment + invitation, revoked it,
confirmed the student link is rejected.

**Responsive**: assignments/candidates/result pages checked at 1440,
1024, 768, 480, and 375px — no horizontal overflow, tables scroll
independently of the page, dialogs remain usable, zero console errors
throughout every session.

## Known limitations

- **Assignments list "Actions" column offers View (+ Result) only** —
  see "Assignments page" above for why Copy/Generate/Regenerate/Revoke
  stay on the detail page rather than being duplicated inline.
- **Score/Progression columns cost one extra query per completed row**
  (reusing `getAdminResultDetail`) — acceptable at MVP scale, same
  precedent as the pre-existing candidate/assignment-count computations
  (see `PHASE_2B.md`); would need batching if the candidate list grows
  into the thousands.
- **`npm audit` flags a moderate `uuid` advisory** pulled in transitively
  by the new `exceljs` dependency — reviewed: the advisory is about
  `uuid`'s v3/v5/v6 functions when a caller supplies a `buf` option;
  `exceljs` only calls `uuid.v4()` (pure random generation, confirmed by
  reading its source), which is not the affected code path. Not
  addressed via `npm audit fix --force`, which would downgrade `exceljs`
  to 3.x and — more importantly — **`prisma` to 6.19.3**, contradicting
  this phase's explicit "do not replace the Prisma architecture"
  instruction (the `mysql2`/`deepmerge-ts` advisories in that same audit
  output are pre-existing, from Prisma's own dependency tree, confirmed
  present before this phase's `npm install` too — not introduced here).
