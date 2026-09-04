# Design System — Vertex Placement

Authoritative as of Phase 2G (product-wide premium UI/UX redesign). Phase 0's
original direction (below, in "History") still holds; this document now also
records what the redesign actually shipped so it can't drift out of sync with
the real tokens/primitives in `src/`.

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

## Cards

Variants in practical use: standard (Card default), metric
(`MetricCard`), result (student/admin result cards), and the student
answer-option "card" (a large, fully-clickable `role="radio"` button,
unchanged anatomy from Phase 0 — still never a small radio + label).

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

`src/components/ui/table.tsx`: header cells are now `uppercase
tracking-wide font-semibold` (small caps read as more "authored," less
like a raw data dump); row padding grew from `py-2.5` to `py-3`; row
hover softened to `bg-muted/40` with a 150ms transition. Every admin
list still wraps its `<Table>` in the same `overflow-x-auto rounded-xl
ring-1 ring-foreground/10` container — horizontal scroll on narrow
viewports, never column compression that makes data illegible.

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
