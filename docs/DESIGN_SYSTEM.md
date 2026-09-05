# Design System — Vertex Placement

Authoritative as of Phase 2G.1 (premium EdTech admin refinement). Phase 0's
original direction (below, in "History") still holds; this document now also
records what Phase 2G and 2G.1 actually shipped so it can't drift out of sync
with the real tokens/primitives in `src/`.

## Result detail — placement semantics (Phase 2G.1 audit)

A QA pass surfaced a specific attempt (4/70 correct, 66 unanswered,
manual submission after ~1 minute) whose admin result page appeared to
show the candidate had reached **Pre-Intermediate**. Audited the
implementation before touching anything:

- `result.level` (rendered as the top `Badge` in the Score card) comes
  from `PlacementBand` — the **admin-configured, percentage-based**
  mechanism (`src/server/services/attempt.service.ts`, `placementBand`
  relation). This is the product's actual configurable placement
  result (see `/docs/PRODUCT_RULES.md` "Scoring & placement").
- The band that read "Pre-Intermediate" in the QA report is a
  **different, unrelated field**: `result.progression.progressionBand`
  (`src/domain/placement/progression.ts`), computed purely from the
  **highest correctly-answered question number** — 66 unanswered
  questions and 0 incorrect answers don't lower it, because the
  function only ever looks at the single highest correct order (by
  design — see the module's own doc comment, "never assumes a question
  was answered correctly just because a later one was," and the
  reverse is equally true: it never discounts a correct answer for
  what surrounds it). This was already correctly implemented and
  already documented as "descriptive guidance, never a certification"
  — the bug was purely in how safely the *UI* communicated that.
- **No scoring/progression logic was changed.** Fixed at the UI layer
  only:
  - The Score card's badge now carries a "Placement band" eyebrow
    label so it reads as a distinct, named mechanism rather than an
    unlabeled "the" result.
  - The progression card is retitled "Question progression guidance"
    with an explicit "Not an official placement" description in its
    `CardHeading` (previously a single easy-to-skim caption below the
    fold).
  - A new conditional warning (`isThinEvidence` in the page, `answered
    / total < 20%` and a band is present) renders when a band is being
    shown on very sparse answering — exactly the QA scenario — stating
    plainly that it "should not be treated as a reliable placement
    signal." This is a presentation-only heuristic against
    already-computed fields; it does not feed back into any stored
    value.
  - Removed **"Canonical: Yes"** from the visible Score panel —
    `isCanonical` is internal dedup/superseding plumbing for a retake
    path the product doesn't expose yet (see
    `src/components/admin/assignments/invitation-panel.tsx`'s own
    comment: a new invitation isn't offered once an assignment is
    completed), so it was raw data-model terminology with no
    operational meaning for today's admin. The field itself is
    untouched in the domain/service layer.
- **Open item, not resolved in Phase 2G.1**: whether `progressionBand`
  should itself require some minimum answered-question threshold
  before surfacing a band at all is a scoring/business-rule decision,
  out of scope here per the instruction to fix UI semantics only. Flag
  for a future phase if product wants that threshold enforced upstream
  rather than only flagged in the UI.

## Phase 2G.1 — what changed

Phase 2G unified the visual language product-wide; a real screen-by-screen
pass afterward found the admin console still read as "clean SaaS template"
rather than a premium EdTech product — plain bordered cards, spreadsheet-like
lists, a generic login, and a dashboard that didn't communicate system state
at a glance. Phase 2G.1 is a **refinement** of the same system (no new
palette, no new tokens beyond what's noted below), focused entirely on
hierarchy, surface treatment, and the data-list/table language:

- **`CardHeading`** (`src/components/ui/card.tsx`) — the icon-chip + title
  (+ description) + action header now used by every section card
  (Test information, Assignments, Placement bands, Candidate, Test,
  Invitation, Attempts, Score, Placement guidance, Topic performance,
  Difficulty progression, Question analysis). One primitive instead of a
  bare `<CardHeader><CardTitle>` repeated on every page — see "Cards" below.
- **`Card` `variant="tinted"`** — a restrained violet-wash surface (`color-mix`
  against `--card`/`--primary`, never a new token) for a card that represents
  configuration or a delivery/access lifecycle rather than plain informational
  content: Placement bands (Test detail) and Invitation (Assignment detail).
- **Table shell moved into the primitive** (`src/components/ui/table.tsx`) —
  every list previously repeated `overflow-x-auto rounded-xl ring-1
  ring-foreground/10` by hand; it's now built into `<Table>` itself, plus a
  `bg-muted/50` header surface and a `TableRowChevronCell` (the same
  fade-in-on-hover chevron the Dashboard's Recent Activity list introduced in
  Phase 2G, now shared by every list table).
- **`MobileRecordCard`** (`src/components/admin/mobile-record-card.tsx`) — the
  stacked-record surface Tests/Candidates/Assignments render below their
  table breakpoint, so narrow viewports get real cards (identity, quiet
  secondary line, scannable meta chips, chevron) instead of a horizontally
  squeezed table. See "Data-list / table system" below.
- **`MetricCard`** gained `tone` (primary/success/warning/info — a
  differentiation cue between tiles, still semantic) and an optional `hint`
  for a real, already-derived qualifier (e.g. "12 assigned a test") — never a
  fabricated delta. It also gained a real `href` (the prop existed but was
  never wired up): when given, the whole tile is a `Link` to the relevant
  list, rendered as `variant="interactive"` with a trailing arrow that fades
  in on hover, plus a per-tone 1px top accent stripe — see "Surface hierarchy"
  below.
- **`TableRow`** gained a permanent (transparent-at-rest) 2px left border
  that turns violet on hover — a color-only change, so it never shifts
  layout — reusing the sidebar's own active-indicator language for row
  hover. `last:border-0` was narrowed to `last:border-b-0` so the last row
  keeps this left accent instead of losing it along with its bottom border.
- **`EmptyState`** dropped the dashed border for a quieter tinted surface and
  shrank its vertical padding — intentional, not a large empty box.
- Admin login (`src/app/admin/login/page.tsx`) redesigned twice: an initial
  centered-card pass, then replaced by the **approved** fullscreen split
  environment — brand panel (left) and sign-in form (right) divided by a
  faded vertical rule, collapsing to one stacked column with no divider
  below ~900px. Reuses the permanently-dark `--sidebar*` tokens (see "Admin
  shell") rather than a new palette; adds a password show/hide toggle and a
  decorative progression-band motif (split top/bottom around the brand block
  so labels never overlap it). Do not redesign this again without a shared
  design-system change forcing a small adjustment.
- The Tests page's import action is labeled **"Import"** (was "Import
  Language Hub test") — it's the future general import entry point; the
  dialog's own content still names the Language Hub source explicitly. No
  import architecture or business logic changed.
- **Test/Candidate detail `Stat` chips** — the bare `dt`/`dd` metadata pairs
  (Status/Duration/Questions/Created, Phone/Age/Email/Added) now sit in a
  `bg-muted/40` rounded chip each (a Level 3 inset — see "Surface hierarchy")
  instead of floating as plain text directly on the card.
- **Admin shell scroll architecture fixed** — see "Admin shell" below; this
  was a layout defect (the sidebar scrolled away with long page content),
  not a stylistic change.
- **Result detail placement semantics** — see "Result detail — placement
  semantics (Phase 2G.1 audit)" above.

## Visual philosophy

Premium, modern, calm, intelligent, educational, precise, trustworthy,
polished — a serious assessment platform for language schools and
educational centers, not an internal dev dashboard, a generic shadcn
starter, an old LMS, or a gamified quiz app. The landing page
(`src/app/page.tsx`) already set this direction; Phase 2G's job was to
carry it — one brand, one design system — through the entire admin
console and the student assessment experience, not to invent a second
visual language for "the app part" of the product.

Concretely, this means:

- Violet (`--primary`) is a **deliberate accent** — primary actions,
  selected states, the sidebar's active indicator — never a flooded
  surface color.
- Large flat white areas are replaced with a felt-not-noticed violet
  atmosphere (`.vertex-atmosphere` utility, `src/app/globals.css`),
  not a gradient-heavy or glassmorphic treatment.
- Admin stays information-dense (Linear/Stripe-influenced); the student
  test-taking surface stays generous and single-column (Brilliant-influenced).
  That asymmetry is structural, not just a palette swap — see "Student vs.
  admin" below.

## Color / tokens

All tokens are CSS variables in `src/app/globals.css` (Tailwind v4
`@theme inline`, OKLCH) — this document names their *role*, not their
hex/OKLCH value, so it can't drift.

| Token | Role |
| --- | --- |
| `--primary` / `--primary-hover` (via `hover:bg-primary/90`) | Vertex violet — CTAs, selected answer cards, active nav item, links |
| `--primary-soft` | A softer, lower-contrast violet wash — metric-card icon chips, empty-state icon badges, "answered" checkmarks — anywhere `--accent` would read too strong |
| `--accent` | Soft violet tint — hover/selected surface backgrounds |
| `--success` / `--warning` / `--destructive` / `--info` | Semantic states only — never decorative. `--info` (blue) was added in Phase 2G for future informational badges/callouts alongside the pre-existing three |
| `--background` / `--card` / `--border` / `--muted-foreground` | Neutral scale carrying most of the UI |
| `--sidebar*` | Dedicated dark palette for the admin shell, unchanged by theme |

## Typography

Geist for both UI and body text (unchanged from Phase 0). Practical
hierarchy, reinforced in Phase 2G:

- **Page title** (`PageHeader`): `text-2xl font-semibold tracking-tight`,
  with an optional **eyebrow** (`text-xs font-semibold tracking-[0.14em]
  text-primary uppercase`) above it for section context (e.g. "Overview",
  "Operations", "Authoring") — used where it adds orientation, not forced
  onto every page.
- **Section/card title** (`CardTitle`): `text-base font-medium`.
- **Metric** (`MetricCard`): `text-2xl font-semibold tabular-nums` — every
  number that matters (dashboard stats, scores, question counts) uses
  `tabular-nums` so digits don't jitter.
- **Body / secondary / caption**: `text-sm` / `text-sm text-muted-foreground`
  / `text-xs text-muted-foreground`, unchanged.
- Student test screen keeps the largest, highest-contrast text for the
  question prompt; the "Question N of M" label is now `text-primary` (a
  small, deliberate accent) rather than muted gray, since it's the one
  piece of orientation text worth a glance.

## Spacing / grid

- Admin pages: `mx-auto max-w-6xl flex flex-col gap-6 p-4 md:p-8`
  (`max-w-4xl`/`max-w-5xl` for single-record detail pages) — unchanged
  container convention, now paired with a consistent `PageHeader` that
  carries its own bottom border (`border-b border-border/70 pb-5`) so
  every page's header-to-content transition reads the same way.
- Dialogs: `p-5` body, `-mx-5 -mb-5 p-4` footer (previously `p-4`/`-mx-4
  -mb-4` — bumped for the new `rounded-2xl` scale, see below).

## Border / radius / shadow

A real hierarchy now, not one radius reused everywhere:

| Layer | Radius | Shadow |
| --- | --- | --- |
| Small controls (buttons, inputs, badges) | `rounded-lg` / pill | none at rest |
| Cards | `rounded-xl` | `shadow-xs`, `ring-1 ring-foreground/10` |
| Interactive cards (`<Card variant="interactive">`) | `rounded-xl` | `shadow-md` + `ring-primary/25` on hover |
| Dialogs / major panels | `rounded-2xl` | `shadow-xl` |
| Student answer options / result cards | `rounded-2xl`/`rounded-3xl` | `shadow-xs` |

`Card` (`src/components/ui/card.tsx`) gained a `variant="interactive"`
prop for this — used wherever a card is itself a click target, never on
purely informational cards.

## Surface hierarchy (Level 0–3)

A named hierarchy for "how deep is this surface," so a new page reaches
for the right layer instead of another ad-hoc gray box:

| Level | Role | Implementation |
| --- | --- | --- |
| **0 — page background** | The canvas everything sits on. | `bg-background` + `.vertex-atmosphere` (the restrained violet radial-gradient utility) on `<main>`. |
| **1 — primary content surface** | A section's main card. | `Card` default — `bg-card`, `shadow-xs`, `ring-1 ring-foreground/10`, `rounded-xl`. |
| **2 — interactive / emphasized surface** | A card that's itself a click target, or one representing a configuration/lifecycle area. | `Card variant="interactive"` (hover lift + `ring-primary/25`) or `variant="tinted"` (restrained violet-wash `color-mix` surface — Placement bands, Invitation). `MetricCard`'s per-tone top accent stripe and `TableRow`'s hover-only left accent border are the same idea applied to a tile/row instead of a card. |
| **3 — subtle inset / metadata area** | A quiet region *inside* a Level 1/2 surface — a stat chip, a disclaimer strip, an empty state. | `bg-muted/30`–`bg-muted/50` insets with `rounded-lg`, no additional ring/shadow (a Level 3 surface never competes with its parent's border). Examples: the `Stat` chips on Test/Candidate detail, `EmptyState`, the `ProgressionTrack` container. |

Rule of thumb: never stack two Level 1+ surfaces directly (a card
inside a card) — nest a Level 3 inset instead. Never make everything
violet: Level 2's tint/accent is reserved for the one or two surfaces
per page that are genuinely configuration, delivery-lifecycle, or
click-target areas.

## Cards

Variants: `default`, `interactive` (hover lift/border — only when the
card itself is a click target), and `tinted` (Phase 2G.1 — a restrained
violet-wash surface via `color-mix`, for a configuration or
delivery/lifecycle card, never a purely informational one). Practical
uses beyond a plain section card: metric (`MetricCard`), result
(student/admin result cards), and the student answer-option "card" (a
large, fully-clickable `role="radio"` button, unchanged anatomy from
Phase 0 — still never a small radio + label).

Every section card's header should be `CardHeading` (icon chip + title
+ optional description/action, with its own bottom rule) rather than a
bare `<CardHeader><CardTitle>` — introduced in Phase 2G.1 specifically
so "Test information," "Candidate," "Invitation," "Score," etc. all
read as labeled product surfaces with one shared anatomy.

## Data-list / table system

Introduced in Phase 2G.1 to replace the "spreadsheet" feel of Tests,
Candidates, and Assignments:

- `<Table>` itself now carries the rounded/ring/surface shell — pages
  no longer wrap it in a repeated `overflow-x-auto rounded-xl ring-1
  ring-foreground/10` div.
- `TableRowChevronCell` — a trailing, header-less column whose chevron
  is invisible at rest and fades in on row hover (`group/row`), reusing
  the exact affordance the Dashboard's Recent Activity list established
  in Phase 2G. Add it as the last `<TableHead aria-hidden="true" />` /
  `<TableRowChevronCell />` pair on any clickable list.
- Column hierarchy: the row's primary identity (a candidate's name, a
  test's title) is `font-semibold`/`font-medium` and a `Link`; secondary
  context (contact details, a test title on the Assignments list) is
  `text-muted-foreground`; a scannable result/score value keeps
  `tabular-nums`-style weight (`font-medium text-foreground`) with its
  percentage qualifier muted.
- **Mobile**: below each list's own breakpoint (`md:` for Tests/
  Candidates, `xl:` for the wider 8-column Assignments table — visual
  QA at 1024 showed its Progression/Created/Action columns clipping at
  `lg:`, so its cutover sits one breakpoint higher than the other two),
  the `<Table>` is replaced — not squeezed — by a `<ul>` of
  `MobileRecordCard` (`src/components/admin/mobile-record-card.tsx`):
  identity, a quiet subtitle, wrapped meta chips (status/score badges),
  and a trailing chevron. One shared card primitive so all three lists
  render the same "record" language on narrow viewports instead of
  three hand-rolled layouts.
- `TableRow` also carries a permanent (not just on-hover) 2px
  transparent left border that turns `primary/70` on hover — the same
  "left accent bar" language as the sidebar's active-nav indicator,
  reused here so a row's hover state reads as more than a flat
  background tint. The border is always present (just transparent at
  rest) specifically so its color-only change on hover never shifts
  layout.

## Buttons

`src/components/ui/button.tsx`. Default height moved from `h-8` to
`h-9` (matching the new `h-9` Input/Select) for a less cramped, more
tactile feel; `lg`/`icon`/`icon-lg` scaled proportionally. Primary
(`default`) variant gained a soft violet shadow (`shadow-sm
shadow-primary/20`, strengthening on hover) instead of a flat fill —
the one visual signal that a button is *the* primary action on screen.
All variants keep a fast (150ms) transition and a subtle
`active:scale-[0.98]` press feedback.

## Forms

`Input`/`Select`/`Textarea` moved to `h-9` (`Textarea` `py-2`) to match
Button, with `px-3` instead of `px-2.5`. Labels, error text, and
grouping patterns (a `Field` helper local to each dialog) are
unchanged — Phase 2G is a shared-primitive redesign, not a rewrite of
every form's local field-rendering logic.

## Tables

`src/components/ui/table.tsx`: header cells are `uppercase
tracking-wide font-semibold` on a `bg-muted/50` header surface (small
caps read as more "authored," less like a raw data dump); row padding
is `py-3`; row hover softened to `bg-muted/40` with a 150ms transition.
The rounded/ring/surface shell (`rounded-xl bg-card ring-1
ring-foreground/10`) lives on `<Table>` itself as of Phase 2G.1 — see
"Data-list / table system" above for the shell, the hover-chevron
affordance, and the mobile stacked-card fallback that replaced
horizontal squeezing on the three record lists.

## Status badges

One coherent system (`src/components/admin/status-badge.tsx`): every
status badge (`TestStatusBadge`, `QuestionStatusBadge`,
`AssignmentStatusBadge`, `InvitationStatusBadge`, `AttemptStatusBadge`)
now renders through a shared `StatusBadge` helper that prefixes the
label with a small `bg-current` dot — status is still never
color-only (the label text is the actual signal), the dot is a purely
decorative reinforcement and is `aria-hidden`.

## Admin shell

`src/components/admin/admin-shell.tsx` — same structural pattern as
Phase 0/1 (persistent dark sidebar, off-canvas drawer below `md`), with:

- **Active nav indicator**: a 2px violet bar on the left edge of the
  active item, plus a violet icon chip (`bg-sidebar-primary/15`) — not
  just a background-color swap.
- **User profile block**: a real compact block now — `Avatar` with
  initials fallback, name + truncated email, and a role pill
  (`SUPER`/`ADMIN`) — replacing three stacked plain text lines.
- **Mobile drawer**: always mounted (not conditionally rendered), so
  both open and close get a real 200ms transform/opacity transition
  instead of an instant pop; closes automatically on route change.
- **Page-transition fade**: `<main>` is keyed by `pathname` and carries
  `animate-page-in` (a 240ms fade + 4px translate) — a subtle "this is a
  new page" cue on every navigation, respecting `prefers-reduced-motion`
  (see "Motion").
- **Atmosphere**: `<main>` also carries `.vertex-atmosphere`, the same
  restrained violet-radial-gradient treatment used on the login and
  student screens, so the admin canvas is felt rather than flat white.
- **Scroll architecture (Phase 2G.1 fix)**: the shell root is a fixed
  `h-dvh overflow-hidden` (was `min-h-dvh`, which only sets a floor —
  with no fixed height, a tall page (e.g. Result detail's Question
  analysis table) grew the whole flex row taller than the viewport and
  the *document* scrolled, dragging the sidebar along with it). Only
  `<main>` now scrolls (`overflow-y-auto`); the sidebar and the mobile
  topbar stay put for the viewport height, profile/sign-out included.
  This requires `min-h-0` on both the content column and `<main>` — the
  classic flexbox trap where a flex child's default `min-height: auto`
  makes it grow to fit its content instead of honoring
  `overflow-y-auto`. Dialogs are unaffected (their portal renders to
  `document.body`, outside this container, so `position: fixed`
  dialogs/popovers still position against the viewport regardless of
  the shell's own overflow).

## Student assessment UI

Unchanged in *architecture* (welcome → candidate confirmation →
instructions → test → result, one `PlacementFlow` state machine) —
Phase 2G polished the surface:

- **Welcome / instructions / candidate form**: `.vertex-atmosphere` +
  `animate-page-in` wrapper; the instructions rule list is now a single
  bordered card with small violet check-chips instead of bare list items.
- **Answer options**: unchanged large-card anatomy; selected state
  gained a subtle `shadow-sm shadow-primary/10`; transitions are
  `duration-150` (fast, per the motion rules below).
- **Question transitions**: each question fades + slides in
  (`animate-in fade-in-0 slide-in-from-bottom-1 duration-200`) on
  `key={questionId}` remount — fast enough to never delay interaction.
- **Timer**: the critical (<60s) state now uses a custom
  `animate-soft-pulse` (opacity 100%→75%→100%, 1.8s) instead of
  Tailwind's default `animate-pulse` (which dips to 50% and reads as
  more alarming than intended).
- **Question navigator**: unchanged desktop grid; on narrow viewports
  with more than 12 questions (i.e. the real 70-question test, not a
  short dev/demo test) it collapses behind a summary toggle
  ("Question navigator (N/70 answered)") instead of filling the
  screen with buttons — always fully expanded on `sm:` and above.
- **Result screen**: score card unchanged in content; the progression
  section now renders the shared `ProgressionTrack` stepper (see
  below) instead of a plain label, still visually and
  terminologically distinct from a score/percentage bar.
- **Error states**: each error code (`INVITATION_NOT_FOUND`,
  `INVITATION_REVOKED`, `INVITATION_EXPIRED`, etc.) now gets its own
  icon (link/shield-off/clock-alert/server-crash) so "invalid link,"
  "revoked," and "server error" read as visually distinct situations,
  not one generic error box.

## Shared primitives introduced in Phase 2G

- **`MetricCard`** (`src/components/admin/metric-card.tsx`) — icon +
  strong number + label, used by the Dashboard's four stat tiles.
- **`ProgressionTrack`** (`src/components/shared/progression-track.tsx`)
  — a six-step horizontal stepper for the source progression bands,
  shared by the student result screen and the admin result detail page
  so both render the exact same `currentOrder` derived value with one
  visual language. Presentation only — never computes a band itself.
- **`CopyField`** (`src/components/shared/copy-field.tsx`) — a
  polished copyable value field (used for the one-time invitation
  link) with a check-icon "Copied" confirmation, replacing a bare
  `<code>` + button pair.
- **`EmptyState`** gained an `icon` prop (defaults to an inbox icon) —
  every empty state in the admin now uses a context-appropriate icon
  (users, send, clipboard, search-x for "no matches") in a soft violet
  badge, still no stock illustrations.
- **`PageHeader`** gained an optional `eyebrow` and a bottom border,
  giving every admin page a slightly stronger, more consistent header.

## Motion system

Defined once in `src/app/globals.css`:

- `.animate-page-in` — 240ms fade + 4px translate-up. Used for
  full-page mounts (admin `<main>` per route, login card, every
  student wizard screen).
- `.animate-soft-pulse` — 1.8s restrained opacity pulse for the
  critical timer state only.
- Component-local motion (button press, card hover, dialog
  enter/exit, question fade, copy-field feedback) all stays in the
  120–250ms range per the brief; nothing loops decoratively except the
  one restrained timer pulse.
- **`prefers-reduced-motion: reduce`** is honored globally — a single
  base-layer media query collapses all animation/transition durations
  to effectively zero, rather than checking it per component.

## Responsive rules

Unchanged from Phase 0/1's intent, reconfirmed in Phase 2G's browser
pass: student test screen stays single-column at every breakpoint;
admin tables scroll horizontally rather than compress illegibly; the
admin sidebar becomes a full off-canvas drawer below `md` with its own
open/close transition; the question navigator gets a mobile-specific
collapse (see above) for the real 70-question test.

## Accessibility

- Status is never communicated by color alone (badge dot is
  decorative/`aria-hidden`; the label text carries the meaning).
- Every interactive primitive keeps its `focus-visible:ring-3
  focus-visible:ring-ring/50` treatment; nothing in Phase 2G removed or
  weakened a focus ring.
- `prefers-reduced-motion` is honored globally (see "Motion").
- The student answer options remain real `role="radio"` elements inside
  a `role="radiogroup"` (unchanged from Phase 0/1) — screen readers
  announce "radio button, N of M, selected/not selected," not a
  generic clickable div.

## History (Phase 0 direction, retained)

See git history for the original Phase 0 section of this document,
which set the initial Vertex violet token direction, the 40/35/15/10
design-influence split, and the student/admin structural distinction —
all of it still holds; Phase 2G executed it product-wide rather than
replacing it.
