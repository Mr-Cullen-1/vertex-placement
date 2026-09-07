# Deployment

This is a **manual runbook for the user** — Claude Code does not push to
GitHub, create/configure a Vercel project, or run any production deploy
command. Every step below is performed by a person, in this order.

## 0. Prerequisites

- A GitHub repository this project can be pushed to.
- A Vercel account/team.
- A Supabase (or other managed Postgres) project for production data,
  separate from the development database used locally.
- A [Resend](https://resend.com) account, with a sending domain verified
  (or use Resend's own `onboarding@resend.dev` sender to start).

## 1. Verify the local working tree

```
git status
```

Should show only the intended committed changes — no stray screenshots,
scratch scripts, or `.env` contents. `git log -1` should show the
pre-deploy commit described in this phase's report.

## 2. Push the repository to GitHub

```
git remote add origin <your-repo-url>   # first time only
git push -u origin main
```

## 3. Create/import the Vercel project

Import the GitHub repository in the Vercel dashboard (or `vercel link`
locally, run by you — not by Claude Code). Framework preset: Next.js.
Build command and output directory can stay at their Next.js defaults.

## 4. Configure required environment variables

In the Vercel project's Environment Variables settings, set every key
listed in [`.env.example`](../.env.example) for the **Production**
environment (and Preview, if you want preview deployments to work
against the same or a separate database):

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Supabase **Transaction Pooler** connection string (port 6543) — the app holds no long-lived direct connections. |
| `DIRECT_DATABASE_URL` | Yes | Supabase **Direct** connection string (port 5432) — used only by `prisma migrate deploy`, run by you, never automatically. |
| `AUTH_SECRET` | Yes | Generate with `npx auth secret` or `openssl rand -base64 32`. Different from any value used in development. |
| `NEXT_PUBLIC_APP_URL` | Yes | The production URL (e.g. `https://placement.vertexquiz.com`) — used to build invitation links. |
| `RESEND_API_KEY` | Not required to build; **required to operate** Try Yourself | The build succeeds without it. But if Try Yourself is enabled (a test has `isPublicSelfService = true`), verification codes **will not send** without it — see step 8. |
| `RESEND_FROM_EMAIL` | Same as above | A sender on your verified domain. Resend's own `onboarding@resend.dev` works without domain setup if you want to deploy before verifying a domain. |
| `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` | Required only if you want the contact button shown | Shown once a visitor has used both free Try Yourself attempts. Omitting it just hides that button — never a fake address. |

Do not set `SEED_SUPER_ADMIN_*` / `SEED_DEV_SAMPLE_TEST` in production —
those are for local bootstrap only and the sample-test seed explicitly
refuses to run when `NODE_ENV=production`.

## 5. Configure production database values

Confirm `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct) both
point at the same **production** Supabase project — not the development
one this repo has been developed against.

## 6. Run the production Prisma migration safely

From your own machine (with `DIRECT_DATABASE_URL` pointed at production):

```
npx prisma migrate deploy
```

This applies the committed migrations in `prisma/migrations/` in order.
It does **not** run `prisma migrate dev` (which can prompt for a
destructive reset) and does not run automatically as part of the Vercel
build — run it deliberately, once, before the first request needs it.

If the production database is brand new, also bootstrap the first Super
Admin:

```
SEED_SUPER_ADMIN_EMAIL=you@yourcompany.com \
SEED_SUPER_ADMIN_PASSWORD=<a strong password> \
DATABASE_URL=<production DIRECT_DATABASE_URL> \
npx prisma db seed
```

Then import the real "Language Hub Placement Test" content (the
existing test/question import flow — an Admin can do this from
`/admin/tests` after logging in, or restore it from an already-populated
database via your own backup/migration process). Do **not** run
`scripts/apply-language-hub-institutional-bands.mjs` against production
unless that test's bands genuinely need creating for the first time —
it's idempotent and safe to re-run, but is a database-affecting script
like any other and should be run deliberately, not by default.

## 7. Configure Auth.js production URL/secret

`AUTH_SECRET` must be set (step 4). Auth.js/NextAuth v5 derives its own
trusted host from the request in most deployments; if Vercel's docs for
your setup call for an explicit trusted-host or canonical-URL variable,
follow their current guidance — this project doesn't hardcode one.

## 8. Configure Resend

**Build requirement vs. operational requirement — these are different:**
the app **builds and deploys successfully without any Resend
configuration at all** (`RESEND_API_KEY` isn't in the strict `env.ts`
schema that fails the build — see `src/server/email/index.ts`). But if
Try Yourself is enabled in production (i.e. some test has
`isPublicSelfService = true`), **email verification will not actually
function** until `RESEND_API_KEY` (and `RESEND_FROM_EMAIL`) are set:

- **Required for a production launch with Try Yourself enabled:**
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- Without them, `src/server/email/console-provider.ts` is selected
  instead — and it **throws** rather than silently logging codes,
  because it refuses to run at all when `NODE_ENV=production`. That's a
  clear, safe failure (visitors see the verification-code request fail
  with an error), never a silent fallback that would leak codes
  anywhere reachable.
- Admin login and the admin-invited candidate flow do not depend on
  email at all — you can deploy and use those without Resend configured.

Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel (step 4) before
relying on Try Yourself in production. Do not configure Resend remotely
or send a real production email as part of this preparation phase —
that's this step, performed by you, when you're ready.

## 9. Configure support contact

`NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` is optional in general, but
**required** if the production "used both free attempts" screen should
show a real contact action rather than omitting the button — the UI
degrades gracefully either way (no fake address is ever shown), so this
is a product decision, not a build requirement.

## 10. Deploy

Trigger the deploy from the Vercel dashboard (or push to the branch
Vercel is watching). This step is yours — Claude Code does not run
`vercel`, `vercel --prod`, or any deployment command.

## 11. Verify admin login

Confirm the real Super Admin account (seeded in step 6) can log in.

## 12. Verify Test Admin login

If you're migrating/restoring the same account set used in development,
the "Test Admin" account (a regular Admin the product owner created
intentionally to exercise the day-to-day Admin experience — see this
phase's report) can log in and reach Dashboard/Tests/Candidates/
Assignments/Results normally, and cannot reach the "Admin accounts"
section of `/admin/profile`. Any Admin account you create fresh in
production should behave identically — this is role-based, not
per-account.

## 13. Verify Try Yourself OTP email delivery

With `isPublicSelfService = true` on the intended production test (see
step 6) and Resend configured (step 8), request a real verification
code against production and confirm the email actually arrives
(Resend's dashboard shows delivery status too).

## 14. Verify the Language Hub public test loads

`/try` should resolve to the exact test you designated in step 6 — 70
questions, the 6 institutional RAW_SCORE bands, PUBLISHED. Confirm this
against the real data (the eligibility/ready screen), not just that the
page renders.

## 15. Run one safe smoke assessment

Complete one real assessment end to end (Try Yourself or an
admin-issued invitation) and confirm the result page renders correctly
with real, freshly-computed data — score, Recommended Level, and
Detailed Analysis all present.

## 16. Verify Result

Open the same completed attempt from the Admin side
(`/admin/results/[attemptId]`) and confirm the admin-facing Result
Detail shows the identical Recommended Level and score as the
student-facing one — one shared resolver, never two.

## 17. Verify no QA data appears

The pre-deploy cleanup (see this phase's report) emptied the development
database of QA candidates/assignments/tests, but that cleanup ran
against the **development** database — a fresh production database
starts empty by construction. Confirm the Dashboard, Candidates, and
Assignments lists show only what steps 11–15 actually created (plus
Test Admin, if migrated), with no leftover fixture titles ("QA",
"Phase2...", "Test edited", etc.) anywhere. If you completed a smoke
assessment in step 15 purely to verify the flow, consider whether to
keep or remove that one candidate/result before treating production as
launch-ready — your call, not an automated cleanup.
