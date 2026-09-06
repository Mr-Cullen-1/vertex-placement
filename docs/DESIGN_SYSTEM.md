# Design System — Vertex Placement

Authoritative as of the Redesign pass (see "Redesign pass" below), building
on Phase 2G/2G.1/2I/2L. Phase 0's original direction (below, in "History")
still holds; this document records what actually shipped so it can't drift
out of sync with the real tokens/primitives in `src/`.

## Redesign pass

A full-product UX/UI redesign request (Testora-level EdTech SaaS polish +
Vertex identity) was scoped, after auditing the actual current state, as a
**targeted gap-closing pass** rather than a ground-up rewrite — the product
already carried real, previously-shipped Vertex design work (Phase
2G/2G.1/2I/2L: violet OKLCH tokens, restrained atmosphere backgrounds, card
variants, a dark admin sidebar, an existing no-horizontal-scroll table
system, a working Collapsible-based Detailed Analysis). Rewriting
already-strong surfaces would have been pure churn. What this pass actually
found and fixed:

- **Rejected-direction cleanup**: the landing page (`src/app/page.tsx`)
  carried hand-drawn-style (`Caveat` font) annotations with scribbled-arrow
  SVGs beside the product-visual hero. Hand-drawn annotations and scribbled
  arrows are an explicitly rejected direction for this product — decorative
  elements with no product purpose. Removed entirely (along with the
  `Caveat` font dependency); the layered product-visual cards (Progression /
  main test / result) now carry the visual interest on their own.
- **`OnboardingShell` + stepper** (`src/components/shared/onboarding-shell.tsx`,
  new) — the "Try Yourself" wizard (email → verify → profile → start) had
  five step components each hand-rolling an identical
  `vertex-atmosphere flex h-dvh …` wrapper with no shared header, no way
  back to the landing page, and no progress indicator. `OnboardingShell` is
  now the one shared shell: a minimal header (wordmark + "Back to home") and
  a lightweight 4-step dot/line indicator, visually subordinate to the
  card it wraps — never a marketing header, never competing with the form.
  Applied to all five `try-*-step.tsx` components. Deliberately **not**
  applied to the invited-candidate flow (`placement-start.tsx`,
  `candidate-form.tsx`, `placement-instructions.tsx`) — that flow has no
  natural 4-step stepper and a "back to home" link doesn't make sense for
  someone who arrived via a direct invitation link; it already met the bar
  on its own and was left alone, per this pass's targeted scope.
- **Student Result "showpiece" upgrade** — `PlacementResult` and
  `TryResultStep` (the two student-facing result screens; kept as separate
  components deliberately, see their own doc comments) previously rendered
  Recommended Level as a small pill above a large raw score. Recommended
  Level is now the true hero (large heading, `text-overline` eyebrow); a new
  `ScoreRing` (`src/components/shared/score-ring.tsx` — hand-built SVG
  circular progress, no charting library) visualizes percentage as a
  supporting secondary element; a new `LevelScale`
  (`src/components/placement/level-scale.tsx`) shows the six standard
  levels with the Recommended Level highlighted. **`LevelScale` is
  deliberately a separate component from `ProgressionTrack`** even though
  the dot/line visual language rhymes — `ProgressionTrack` visualizes the
  question-position-based diagnostic signal, `LevelScale` only ever reads
  the score-based `level` string. Conflating those two was exactly the bug
  Phase 2L fixed; this pass was careful not to reintroduce it through a
  shared component. `TryResultStep` was also missing the Phase 2L
  `DetailedAnalysis` section entirely — added, using the same data
  (`result.detailedAnalysis`) already computed server-side; no new
  business logic.
- **Course-level performance bars** — `DetailedAnalysis`'s "Performance by
  course level" rows were text-only; each row now also carries a compact
  accuracy bar (`entry.percentageOfTotal`, already computed, purely
  presentational) per the "use small bars or compact visualizations"
  requirement.
- **Typography roles** — `src/app/globals.css` gained named semantic
  utilities (`.text-display`, `.text-page-title`, `.text-section-title`,
  `.text-metric`, `.text-overline`, `.text-caption`) so headings are named
  by job, not by guessing a Tailwind size each time. Applied where added in
  this pass; broader rollout across existing headings is a mechanical
  follow-up, not done wholesale here to keep this pass's blast radius
  targeted.
- **Favicon/metadata** — the app previously had only a bare `favicon.ico`
  and no `icons`/`themeColor` metadata. Added `src/app/icon.png` and
  `src/app/apple-icon.png` (generated from the existing
  `public/vertex-logo.png` — the real Vertex mark, not a new asset) via
  Next's file-convention icons, plus a `viewport.themeColor` matching the
  dark sidebar tone, in `src/app/layout.tsx`.
- **Charts**: no charting library was added. The product already hand-built
  every "chart-like" visual (progress bars, `ProgressionTrack`,
  `MetricCard`) with plain SVG/div — `ScoreRing` and the course-level
  accuracy bars follow the same convention rather than introducing
  `recharts`/`d3`/etc. as a new dependency.
- **Tooling note**: the official Anthropic `frontend-design` plugin was not
  installed in this environment (no plugin marketplace configured) and
  could not be installed non-interactively; the Dribbble references in the
  request also aren't fetchable as useful visual data by this agent. This
  pass used the request's own detailed written specification (which
  encodes the Testora-level-polish direction in text: density, restraint,
  no decorative filler, hand-built charts, evidence-aware diagnostic
  language) as the design authority instead.

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

**Phase 2L update**: this page's Score card was restructured into three
visually separated cards — **Objective result** (Recommended Level, raw
score, percentage, answered/correct/incorrect/unanswered, timestamps —
all immutable), **Final Placement** (the new administrative override,
its own card, edited only via `FinalPlacementControl`), and the existing
diagnostic cards (Question progression evidence, the new **Performance
by course level**, Topic performance, Difficulty progression) — so the
three concepts this section's own audit worried about conflating can
never again share one visual block. "Placement band" was renamed
"Recommended Level" everywhere on this page and on the student result
screen, to signal it's an automated recommendation, not an immutable
decision (that's what Final Placement is for). See
[PHASE_2L_SCORING_POLICY.md](./PHASE_2L_SCORING_POLICY.md).

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
- **Mobile**: below each list's own breakpoint, the `<Table>` is
  replaced — not squeezed — by a `<ul>` of `MobileRecordCard`
  (`src/components/admin/mobile-record-card.tsx`): identity, a quiet
  subtitle, wrapped meta chips (status/score badges), and a trailing
  chevron. One shared card primitive so every list renders the same
  "record" language on narrow viewports instead of a hand-rolled layout
  per page.
- **Phase 2K responsive rewrite** (see "No horizontal scrolling"
  below): the Assignments table's original 8-column layout (Candidate,
  Test, Status, Invitation, Score, Level, Created, Action) produced a
  real horizontal scrollbar at desktop widths — the thing this whole
  system exists to avoid. Fixed at the root, not by wrapping it in
  `overflow-x-auto`: dropped the Invitation column (still visible on
  the assignment detail page), merged Score+Level into one "Result"
  column, and folded the self-service origin badge under the candidate
  name as secondary metadata instead of its own column — six columns
  instead of eight. Every table in the app now also sets `table-fixed`
  with explicit per-column `w-[%]` on `<TableHead>`, so a long value
  truncates inside its own cell instead of growing the table — the
  browser's default `table-layout: auto` sizes columns to their
  widest *unwrapped* content, which is what silently reintroduces
  overflow the moment `whitespace-nowrap` (`<TableCell>`'s default) or
  an untruncated long string shows up in real data. With the trimmed
  column set, the Assignments and Candidates tables' cutover to
  `MobileRecordCard` moved from `xl:` back down to `lg:` — re-verified
  by the same kind of visual QA that set `xl:` in Phase 2G.1, not
  picked arbitrarily.
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
affordance, and the mobile stacked-card fallback.

`<TableHead>`/`<TableCell>` still default to `whitespace-nowrap`
(short header labels and short values — a status word, a date, a
score — genuinely shouldn't wrap mid-word), but every table that can
receive a long free-text value (a name, an email, a test title)
overrides that per-cell to `whitespace-normal` and pairs it with
`table-fixed` + an explicit `w-[%]` on each `<TableHead>`, so the
column's allocated width is a deliberate percentage rather than
whatever the browser's auto layout derives from the widest unwrapped
cell. See "No horizontal scrolling" and "Data-list / table system"
above.

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
- **Question navigator / active Test Runner layout**: see "Test Runner
  (Phase 2I)" below — Phase 2G's version (a single collapsible grid
  toggle) was replaced by a persistent sidebar / mobile-drawer split.
- **Result screen**: score card unchanged in content; the progression
  section now renders the shared `ProgressionTrack` stepper (see
  below) instead of a plain label, still visually and
  terminologically distinct from a score/percentage bar.
- **Error states**: each error code (`INVITATION_NOT_FOUND`,
  `INVITATION_REVOKED`, `INVITATION_EXPIRED`, etc.) now gets its own
  icon (link/shield-off/clock-alert/server-crash) so "invalid link,"
  "revoked," and "server error" read as visually distinct situations,
  not one generic error box.

## Test Runner (Phase 2I)

The active test-taking screen (`PlacementTestShell`) was redesigned into
a focused, three-area assessment workspace, translating an examination-
portal reference's *structural* ideas into the existing Vertex system —
the reference's own visual language (blue branding, dense IDE-like
layout) was explicitly not reused. **One runner regardless of attempt
origin**: nothing in `PlacementTestShell`, `PlacementQuestion`,
`AnswerOption`, or the navigator reads or cares whether the attempt was
created by an admin assignment or (a future phase's) public "Try
Yourself" flow — origin-specific behavior, if any is ever needed,
belongs in the page/flow layer that hands the runner its props, never
inside the runner itself.

**Audited first, changed only what needed to change.** Already correct
and left untouched: direct navigation to any question (`onJump`, wired
through both the sidebar and the new mobile drawer — skipping and
returning was always allowed, see `/docs/PRODUCT_RULES.md`), answer
autosave-on-select (`submitAnswerAction` fires immediately, with an
optimistic-then-reverted-on-failure update), the timer's server-issued
`expiresAt` and its normal/warning(≤5min)/critical(≤1min) states, and
the submit confirmation's answered/unanswered breakdown. **Two small,
additive server-layer changes** (not business logic — pure display
data threaded through, per audit): `PlacementStatus`'s `IN_PROGRESS`
kind and `ValidatedInvitation`'s `test` object each gained a `title`
field (`attempt.service.ts`, `invitation.service.ts`) — both were
already loading the test row, just not exposing its title — so the new
sidebar/drawer header has a real test title on both a fresh start and a
resume-after-refresh, not a placeholder.

**Layout** — `src/components/placement/placement-test-shell.tsx`:

- **Desktop (`lg:` / 1024px and up)**: a fixed `h-dvh overflow-hidden`
  shell with a persistent **left question navigator** (`w-72`, its own
  `min-h-0 overflow-y-auto` scroll region — a 70-item grid never forces
  the timer/submit controls out of view), a **top assessment bar**
  (progress summary, timer, an always-available Submit button), a
  **centered question workspace** (`max-w-2xl`, its own scroll region),
  and a bottom Previous/Next footer. Chosen over `admin`'s `md`/900
  thresholds deliberately — visual QA at 768/899/900 showed a sidebar
  there would leave too little width for comfortable reading once a
  260–288px panel is subtracted; 1024 is where both fit.
- **Below `lg`**: the sidebar is replaced by a compact "Questions N/70"
  trigger in the top bar, opening `QuestionDrawer` — a right-sliding
  sheet (always mounted, transform-driven, mirroring the admin shell's
  own mobile-drawer convention) containing the identical
  `QuestionNavigator` grid. No admin/marketing chrome ever appears on
  this route at any width — a genuinely distraction-free assessment
  environment, not just visually quieter.
- **Submit is available from two places on purpose**: the top bar's
  Submit button (any question, any time — nothing server-side ever
  actually required being on the last question; that was only ever a
  UI-layer restriction) and the footer's right-hand button, which
  becomes "Submit test" specifically on the final question. Both open
  the same `SubmitConfirmation` dialog.

**`QuestionNavigator`** (`question-navigator.tsx`) — simplified to a
pure, reusable grid (the old built-in collapse-toggle button is gone;
collapsing/expanding is now the drawer's job, not the grid's). Answered
state is never color-only: a small check badge marks it independent of
the accent tint; the current question gets a solid fill plus
`aria-current="step"`, not just a border change. **Phase 2K**: each
button is `aspect-square w-full` (not a fixed `size-9`) so it always
exactly fills its CSS Grid track — a fixed pixel size could exceed a
narrow track's computed width (the mobile `QuestionDrawer`'s grid,
`max-w-xs`, was the case that actually triggered this) and force a
horizontal scrollbar inside the drawer; see "No horizontal scrolling."
The drawer's grid also dropped from 7 to 6 columns to match the
sidebar's, for the same reason.

**`SubmitConfirmation`** gained a compact Answered/Unanswered/Total stat
row (replacing a sentence) and, when any question is unanswered, a
"Review unanswered" button that closes the dialog and jumps to the
first unanswered question — reusing the existing direct-navigation
plumbing, not a new review/flagging feature (none exists, and none was
invented for this).

**Autosave feedback**: a brief "Saved" confirmation (green check,
~1.5s) now follows a successful save, replacing the previous silent
clear from "Saving…" to nothing — still an inline `aria-live` region,
never a toast.

**Typography**: the question's eyebrow ("QUESTION 24 OF 70") moved to
the small-caps treatment used everywhere else in the product
(`text-xs font-semibold tracking-[0.14em] uppercase`), and the question
text itself grew (`text-2xl`/`sm:text-3xl`) — a stronger, more
deliberate size gap than before, per "the question must become the
visual center of the screen."

**Not changed**: `AnswerOption`'s anatomy (it already met every
requirement — large clickable surface, A/B/C/D marker, restrained
violet selected state, no correctness reveal); the welcome/instructions/
candidate-form/result/error screens (out of scope — this phase is the
active test screen only); any scoring, `PlacementBand`, progression,
attempt-counting, timer, or question-order logic.

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

## Shared primitives added in Phase 2L

- **`Collapsible`/`CollapsibleTrigger`/`CollapsiblePanel`**
  (`src/components/ui/collapsible.tsx`) — thin wrapper over base-ui's
  `Collapsible` primitive. `CollapsibleTrigger` gets `aria-expanded` and
  keyboard handling for free; `CollapsiblePanel` animates via base-ui's
  own measured `--collapsible-panel-height` CSS variable, applied via a
  plain inline style (not a bracketed Tailwind height utility — writing
  it as one, even inside a comment, gets picked up by Tailwind's content
  scanner as a literal class candidate and breaks the build) plus
  `transition-[height]`, collapsing to `data-starting-style:h-0
  data-ending-style:h-0`) — no JS height measurement, no layout jump, no
  external animation library. First consumer:
  `DetailedAnalysis` (`src/components/placement/detailed-analysis.tsx`),
  the student result screen's collapsed-by-default section — see
  "Detailed analysis (Phase 2L)" below.

## Detailed analysis (Phase 2L)

The student result screen's "Detailed analysis" section
(`DetailedAnalysis`) is collapsed by default and expands inline —
never a new page, never an always-open wall of content. Nesting uses the
same `Collapsible` primitive three levels deep: the outer section, an
inner "Review your answers" disclosure, and one `Collapsible` per
question row (70 of them at most, each cheap — no virtualization needed
at this scale, matching this codebase's existing acceptable-N+1
precedents). Structure top to bottom: an evidence-aware strength/weakness
summary, a "Performance by course level" list (six fixed ranges, reusing
`PROGRESSION_BANDS`), then the nested question review. Every row wraps
rather than truncates awkwardly and uses flex/grid, never a table — see
"No horizontal scrolling"; a long prompt or answer simply wraps onto more
lines within its own row.

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
pass: student test screen stays single-column at every breakpoint; the
admin sidebar becomes a full off-canvas drawer below `md` with its own
open/close transition; the question navigator gets a mobile-specific
collapse (see above) for the real 70-question test.

**Superseded in Phase 2K**: this section previously said "admin tables
scroll horizontally rather than compress illegibly." That was the
actual Phase 2G.1 decision, and it regressed — real data (a long test
title, a long candidate name/email, an added origin badge) pushed the
Assignments table wide enough to produce a visible horizontal
scrollbar, which is exactly the pattern the next section now forbids.
See "No horizontal scrolling" immediately below for the replacement
rule, and "Data-list / table system" above for how each table was
actually fixed.

## No horizontal scrolling

**Horizontal scrolling is not an accepted responsive pattern for
standard Vertex Placement application UI** — not for a page, a table,
a list, a card, or a form. Vertical scrolling is allowed and expected
for long content; horizontal scrolling of structural content is a
defect to fix, not a breakpoint to add `overflow-x-auto` around.

When structured content no longer fits at a given width, in this
order:

1. Improve column/space allocation (truncate secondary text, wrap
   where wrapping reads fine, combine related metadata into one
   column, reduce padding) — see "Data-list / table system."
2. Hide genuinely secondary columns/metadata at narrower widths.
3. Switch the desktop table to `MobileRecordCard` — before overflow
   would occur, not after, and at whatever breakpoint real visual QA
   (not an arbitrary Tailwind default) shows is actually needed for
   that specific table's column count and content.
4. Never: let it scroll horizontally.

**Enforcement**: `<Table>`'s own wrapper still carries `overflow-x-
auto` as a last-resort safety net for content that's genuinely
unbreakable (it should never actually engage once a table's columns
are allocated correctly) — `src/app/layout.tsx`'s `<body>` and the
admin shell's `<main>` (`src/components/admin/admin-shell.tsx`) both
also set `overflow-x-hidden` as defense-in-depth, so a future
regression clips instead of growing the whole document wider than the
viewport. Neither of those is the fix itself — see item 1–3 above.

**The one narrow exception**: `CopyField`'s value now truncates with
an ellipsis (`title` attribute for the full value on hover) rather
than scrolling — even a small, self-contained scroll region was
judged not worth keeping once truncation covers the same need (the
Copy button always copies the untruncated value regardless of what's
visually shown). No current admin list/table/card/form has a
legitimate exception — none has intrinsic horizontal content the way,
say, a genuinely horizontal data visualization would.

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
