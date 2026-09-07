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
| `RESEND_API_KEY` | Yes, for self-service | Without it, email verification silently falls back to a provider that **refuses to run in production** (a clear error, not a silent leak) — see step 8. |
| `RESEND_FROM_EMAIL` | Recommended | A sender on your verified domain. Resend's own `onboarding@resend.dev` works without domain setup if you want to deploy before verifying a domain. |
| `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` | Optional | Shown once a visitor has used both free Try Yourself attempts. Omitting it just hides that button — never a fake address. |

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

Set `RESEND_API_KEY` (and `RESEND_FROM_EMAIL`) in Vercel (step 4). Until
you do, self-service ("Try Yourself") email verification is unavailable
in a clearly-signaled way — `src/server/email/console-provider.ts`
**throws** rather than silently logging codes if it's ever selected with
`NODE_ENV=production`, so a misconfigured deployment fails loudly
instead of leaking verification codes anywhere reachable. Admin login
and the admin-invited candidate flow do not depend on email at all.

## 9. Configure support contact

Set `NEXT_PUBLIC_SUPPORT_CONTACT_EMAIL` if you want the "used both free
attempts" screen to show a contact action.

## 10. Deploy

Trigger the deploy from the Vercel dashboard (or push to the branch
Vercel is watching). This step is yours — Claude Code does not run
`vercel`, `vercel --prod`, or any deployment command.

## 11. Run a smoke test against production

Repeat the same walkthrough this phase's report describes locally,
against the real production URL:

- Landing → Try Yourself → verify email → profile → ready → instructions
  → assessment → submit → result → Detailed Analysis.
- Admin login → Dashboard → Tests → Candidates → Assignments → Result →
  Profile.
- Super Admin → Admin Accounts → create a real Admin → have them log in
  → confirm they see normal operational pages and cannot reach Admin
  Accounts.

## 12. Verify Try Yourself OTP delivery

Request a real verification code against production and confirm the
email actually arrives (Resend's dashboard shows delivery status too).

## 13. Verify admin login

Confirm the real Super Admin account (seeded in step 6) can log in, and
that any Admin accounts you create afterward can too.

## 14. Verify a placement attempt/result end to end

Either through Try Yourself or an admin-issued invitation, complete one
real assessment against production and confirm the result page renders
correctly with real, freshly-computed data.

## 15. Verify no QA data appears

The pre-deploy cleanup (see this phase's report) emptied the development
database of QA candidates/assignments/tests, but that cleanup ran
against the **development** database — a fresh production database
starts empty by construction. Confirm the Dashboard, Candidates, and
Assignments lists show only what step 6 onward actually created, with
no leftover fixture titles ("QA", "Phase2...", "Test edited", etc.)
anywhere.
