# Design System — Vertex Placement

Primary visual reference: [`design/DESIGN_REFERENCE.png`](../design/DESIGN_REFERENCE.png).

## Important caveat about the reference image

The reference file is a **Vertex Quiz** mockup (it's labeled "Vertex Quiz,"
shows an "Адаптивный тест" / adaptive-test badge, and its result screen uses
confetti). Vertex Placement is a separate product with different rules —
notably **not** adaptive, and the brief explicitly lists confetti and
gamification as things to avoid. So this reference is used for its **visual
language only** (color, type, spacing, card/button anatomy, information
density), not as a literal spec. Anywhere the mockup's behavior conflicts
with the product rules, the product rules win:

| Reference shows | Vertex Placement does instead |
| --- | --- |
| "Адаптивный тест" badge | No adaptivity messaging anywhere — fixed question order |
| Confetti on the result screen | Calm, static result presentation (no confetti, no celebratory animation) |
| "Vertex Quiz" branding | "Vertex Placement" branding, same mark family |

No UI from the reference is implemented pixel-for-pixel in Phase 0 (styling
is configured — tokens, primitives — not full screens; see
[ARCHITECTURE.md](./ARCHITECTURE.md)).

## Design direction

40% Premium SaaS · 35% Interactive EdTech · 15% Assessment ·
10% Academic/editorial. Brilliant-inspired for the student experience;
Linear/Stripe-inspired density for admin. Explicitly avoided: Google-Forms
aesthetic, old-LMS aesthetic, Kahoot-style gamification, childish design,
heavy gradients/glassmorphism, confetti, unnecessary animation or
illustration.

## Color

Vertex violet is the brand accent — used deliberately (primary actions,
selected states, focus rings, the admin sidebar's active item) rather than
as a dominant surface color, per the brief ("accents and meaningful UI
states rather than covering the entire interface"). Tokens are defined as
CSS variables in `src/app/globals.css` (Tailwind v4 `@theme inline`,
OKLCH), building on the shadcn/ui default token set:

| Token | Role |
| --- | --- |
| `--primary` | Vertex violet — CTAs, selected answer cards, active nav item, links |
| `--accent` | Soft violet tint — hover/selected surface backgrounds (e.g. a chosen answer card before commit) |
| `--success` / `--warning` / `--destructive` | Semantic states — correct-range scores, time-running-low, errors/validation — **not** decorative |
| `--background` / `--card` / `--border` / `--muted-foreground` | Neutral scale carrying most of the UI — the "premium SaaS" restraint comes from how much of the interface is neutral vs. accented |
| `--sidebar*` | A dedicated dark palette for the admin shell (see "Student vs. admin" below) |

Exact hex/OKLCH values live in `globals.css`, not duplicated here, so this
document can't drift out of sync with the real tokens.

## Typography

Geist (already wired via `next/font` in the scaffold) for both UI and body
text — a single, excellent-metrics sans avoids the "editorial vs. SaaS"
tension the brief calls for (10% academic/editorial comes from spacing and
restraint, not from a serif). Practical hierarchy for Phase 1 screens:

- Question prompt text should be the largest, highest-contrast text on the
  student screen — it's the one thing a candidate must read.
  Answer-option text is one step down in weight/size from the prompt.
- Admin surfaces run denser and smaller than student surfaces (Linear/Stripe
  density) — data tables and stat tiles use `text-sm`/`text-xs` where the
  student test screen stays generous.

## Spacing & layout

- **Student surface**: generous whitespace, single-column, one primary
  decision on screen at a time (the current question). Wide gutters even on
  desktop — this is meant to feel calm and focused, not dashboard-dense.
- **Admin surface**: tighter, information-dense grids (stat tiles, tables,
  charts) — the opposite instinct from the student surface, deliberately.
  This asymmetry *is* the "student/admin visual distinction" the brief
  asks for, not just a color change.
- Both surfaces use the shared `--radius` scale (`--radius-sm` through
  `--radius-4xl`, derived from a single `--radius` base in `globals.css`)
  so corner-rounding stays consistent even though density differs.

## Cards

- **Answer option cards** (student): large, clickable, full-width block —
  not a small radio button with a text label next to it. Rest state uses
  `--card`/`--border`; selected state uses `--primary` border/ring plus
  `--accent` background tint; never relies on color alone (also carries a
  visible selected indicator) for accessibility.
- **Admin stat tiles / result cards**: standard `shadcn/ui` `Card`
  (already scaffolded in `src/components/ui/card.tsx`) — label, value,
  optional delta. Denser padding than the student answer cards.

## Buttons

`shadcn/ui` `Button` (`src/components/ui/button.tsx`) as the base. Primary
action (Start Test, Next, Submit, Sign in) uses the violet `--primary`
variant; destructive-leaning actions (revoke a token, delete a draft
question) use the `destructive` variant; everything else defaults to
neutral outline/ghost. One clear primary action per screen — the brief's
"minimal" and "focused" language argues against multiple competing CTAs.

## States

- **Answer selected**: primary-colored border/background tint, as above.
- **Timer normal / urgent (≤5 min) / expired**: normal uses neutral/muted
  text; urgent switches the timer to `--warning` (or `--destructive` in the
  final minute) plus a subtler pulse — not a jarring animation, consistent
  with "avoid unnecessary animations."
- **Loading/disabled**: standard `shadcn/ui` disabled/opacity treatment;
  no custom spinners invented ahead of need.
- **Empty/placeholder states** (e.g. `/admin` and `/placement/[token]` in
  Phase 0): plain, quiet text — no illustration, matching "avoid
  unnecessary illustrations."

## Student vs. admin visual distinction

This is structural, not just palette:

- **Student**: light background, generous spacing, one primary decision
  per screen, minimal chrome (no persistent nav — a student never needs to
  navigate away from their in-progress test).
  Brilliant-style calm focus.
- **Admin**: a persistent **dark sidebar** (`--sidebar*` tokens, dark even
  when the rest of the app is in light mode — see `globals.css`) against a
  light content area, matching the Linear/Stripe pattern from the
  reference image's admin panel. Higher information density, multi-item
  navigation, tables and charts.

## Responsive behavior

- Student test screen: single column at every breakpoint; answer cards
  stack vertically even on desktop (matches the reference's question
  layout) rather than adopting a 2x2 grid, since horizontal grouping can
  make touch/click targets ambiguous under time pressure.
- Admin dashboard: sidebar collapses to icon-only or an off-canvas drawer
  below the `md` breakpoint; stat-tile grids and tables scroll horizontally
  rather than compressing illegibly, consistent with the general artifact
  rule "wide content scrolls in its own container."
- Not implemented as actual responsive screens in Phase 0 — this section
  is direction for Phase 1 build-out.

## What Phase 0 actually shipped

- Tailwind v4 + `shadcn/ui` initialized and configured with the Vertex
  violet token set described above (`src/app/globals.css`,
  `components.json`).
- Base primitives installed: `button`, `card`, `input`, `label`, `badge`,
  `progress`, `separator`, `avatar` (`src/components/ui/`) — enough to
  build the login form and future placeholder screens, not a full
  component library.
- No question screen, no result screen, no admin dashboard shell, no
  answer-card component yet — those are Phase 1.
