# Phase 2G — Product-Wide Premium UI/UX Redesign

Visual/interaction redesign of every user-facing surface in Vertex
Placement — public, admin, and student — so the whole product reads as
one designed system rather than "landing page + generic admin
template + separate test interface." No domain, scoring, RBAC,
invitation-lifecycle, or schema change; see "Explicit confirmations"
at the end.

## Routes / surfaces audited

Every route under `src/app` plus every shared component under
`src/components` was read before any edit (full audit — landing,
admin login, admin shell, dashboard, tests list/detail/questions,
placement bands, candidates list/detail, assignments list/detail,
results detail, all dialogs/forms, and the entire student
`/placement/[token]` flow — welcome, candidate form, instructions,
test shell, question, answer options, navigator, timer, submit
confirmation, result, error states, loading state). `docs/DESIGN_SYSTEM.md`,
`docs/ARCHITECTURE.md`, and Phase 2A–2F docs were read first to
understand what was already an intentional decision vs. what was
merely unpolished.

Findings from the audit: the landing page and the student flow were
already close to the intended visual language (large flat white areas
aside); the admin console was the weakest area — generic `Card`/
`Table` primitives with no elevation hierarchy, a functional but
visually flat sidebar, a plain login screen, and dashboard stat tiles
that were identical undifferentiated rectangles.

## Approach

Foundation-first, per the phase's own recommended order: design
tokens → shared primitives → admin shell → dashboard → the rest of
admin → student flow → responsive/motion/accessibility passes. Because
almost every admin page composes the same `Card`/`Table`/`Button`/
`Badge`/`Input`/`Dialog` primitives, upgrading those primitives once
cascaded a large, consistent visual improvement across ~20 admin pages
without touching each page's business logic — only a smaller, targeted
set of page-level edits (icons, eyebrows, the new `MetricCard`/
`ProgressionTrack`/`CopyField`) were needed on top.

## Shared primitives introduced or changed

New:

- `MetricCard` (`src/components/admin/metric-card.tsx`)
- `ProgressionTrack` (`src/components/shared/progression-track.tsx`) —
  shared by the student result screen and the admin result detail page
- `CopyField` (`src/components/shared/copy-field.tsx`) — used by the
  invitation panel's one-time link

Changed (cascading to nearly every page that uses them):

- `Button`, `Card`, `Badge`, `Table`, `Dialog`, `Input`, `Select`,
  `Textarea` (`src/components/ui/*`) — see `docs/DESIGN_SYSTEM.md`
  for the exact height/radius/shadow/motion changes.
- `PageHeader` — added `eyebrow`, a bottom border, stronger title.
- `EmptyState` — added an `icon` prop, soft violet icon badge.
- `StatusBadge` (the shared helper inside `status-badge.tsx`) — added
  the small status dot used by every status badge variant.
- `AdminShell` / sidebar — active-indicator bar + icon chip, a real
  user-profile block (avatar initials, role pill), an always-mounted
  (properly transitioning) mobile drawer, and a keyed page-transition
  fade on the main content area.

## Admin redesign summary

Every admin page kept its exact data-fetching and business logic;
changes were visual/structural only:

- **Dashboard**: `MetricCard` tiles (icon + real count, no fabricated
  deltas), a refined "Recent activity" list with a hover affordance
  and chevron, an "Overview" eyebrow.
- **Tests / Test detail / Questions**: table polish (inherited),
  context-specific empty-state icons, an "Authoring" eyebrow.
- **Candidates / Candidate detail**: same table polish, a "Operations"
  eyebrow, user/search icons on empty states.
- **Assignments / Assignment detail**: same table polish, invitation
  panel now uses `CopyField` for the one-time link, an "Assignment"
  eyebrow on the detail page.
- **Results**: score presentation strengthened (`text-5xl`,
  `tabular-nums`), placement guidance now rendered as the shared
  `ProgressionTrack` stepper instead of a plain list — still
  explicitly captioned as guidance, not a CEFR cutoff.
- **Login**: brought onto the same atmosphere/motion language as the
  landing page (Vertex mark, subtle violet glow, `animate-page-in`).
- **Error / not-found / loading states**: icon-led, and skeletons now
  approximate the real page's header+content shape to reduce layout
  shift.

## Student redesign summary

Architecture (the `PlacementFlow` state machine, token-based security,
timer authority, answer persistence) is completely unchanged. Visual
changes: atmosphere + entrance motion on every wizard screen, a
fast (200ms) per-question fade/slide transition, a softer critical-timer
pulse, a mobile-collapsible question navigator for the real 70-question
test, and a `ProgressionTrack` stepper on the result screen (replacing
a plain progression label) while preserving the explicit "guidance, not
certification" language and the strict separation from score/percentage.

## Design system documentation

`docs/DESIGN_SYSTEM.md` was rewritten to be the authoritative
reference for the shipped tokens, primitives, and rules (color roles,
typography scale, spacing/radius/shadow hierarchy, card/button/table/
badge conventions, the admin shell, the student assessment UI, the
motion system, responsive rules, and accessibility) rather than only
the Phase 0 direction document it was before.

## Motion system

One small set of primitives in `src/app/globals.css`:
`.animate-page-in` (240ms fade+translate, used for every full-page
mount), `.animate-soft-pulse` (1.8s restrained pulse, critical timer
only), plus component-local 120–250ms transitions (buttons, cards,
dialogs, question fade, copy-field feedback). A single base-layer
`prefers-reduced-motion: reduce` media query collapses all
animation/transition durations globally — not checked per component.

## Responsive verification

Checked at 1440/1024/768/480/375 via a real Chromium/Playwright pass
(dashboard, tests, candidates, assignments, a live assignment +
invitation creation, the full student flow against the real
70-question Language Hub test, the invalid-token error state, and the
mobile nav drawer). No horizontal overflow, no clipped controls, no
console/hydration errors observed. The question navigator's
mobile-collapse behavior was specifically verified against the real
70-question test (not just a short dev test).

## Accessibility

Status dots are `aria-hidden` (label text carries the actual meaning);
every primitive kept its existing `focus-visible` ring treatment;
`prefers-reduced-motion` is honored globally (see "Motion"); the
student answer options remain real `role="radio"` elements inside a
`role="radiogroup"`, unchanged from Phase 0/1.

## Testing

No application logic changed, so the existing 172-test suite is the
regression gate here (not expanded — this phase added no new business
behavior to test). All 172 tests pass; `tsc --noEmit`, `eslint`,
`prisma validate`, and `next build` are all clean (see the Phase 2G
final report for exact command output/status).

## Known limitations

- A moderate, environment-specific rendering artifact was observed
  during browser verification: two of the four answer-option letters
  ("in"/"on" — coincidentally the US-state/Canadian-province two-letter
  abbreviations "IN"/"ON") rendered in a light blue in Chromium
  screenshots on this Windows machine, while `getComputedStyle` on the
  same elements confirmed an identical, correct dark foreground color
  for all four options. This did not reproduce anywhere else in the
  app (e.g. the landing page's static mock question, which also
  contains "in," rendered correctly) and is not caused by anything in
  this phase's CSS/component changes — most likely a Chromium-on-Windows
  autofill/locale heuristic bleeding into button text during automated
  screenshot capture, not a real rendering defect. Flagged for
  awareness; no code change was made since there is nothing in the
  DOM/CSS to fix.
- Dialogs remain built on plain native `<select>` for pickers (test,
  candidate) rather than a custom listbox — an existing, deliberate
  Phase 1 decision (small option counts, full native accessibility)
  that Phase 2G did not revisit, since introducing a custom dropdown
  component was out of this phase's "polish existing primitives"
  scope.
- Per-page `Field` helper components (label+input+error) remain
  duplicated per dialog rather than unified into one shared form-field
  primitive — visual consistency comes entirely from the shared
  `Input`/`Label` primitives underneath, so this was judged not worth
  the behavioral-refactor risk within a phase whose engineering rule
  was "no logic changes."

## Explicit confirmations

- No scoring changes.
- No progression-methodology changes.
- No RBAC changes.
- No invitation-lifecycle changes.
- No schema/migration changes (`npx prisma validate` confirms the
  schema is unchanged from Phase 2F).
- No Phase 2H work started.
