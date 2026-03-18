# Staging Auth Setup

Use staging auth for manual OAuth acceptance only. Automated smoke coverage
should stay deterministic and avoid live Google sign-in.

## Staging Supabase

- Supabase project URL: `https://uxelgkeagzjnwmjspcda.supabase.co`
- Keep staging auth isolated from production auth.
- Use a stable staging app domain for redirects: `https://staging.golfdataviz.com`

## Vercel Env Vars

Set these on the staging deployment:

- `NEXT_PUBLIC_SUPABASE_URL=https://uxelgkeagzjnwmjspcda.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<staging service role key>`
- `NEXT_PUBLIC_BASE_URL=https://staging.golfdataviz.com`

Set existing Turnstile and Sentry values too when anonymous save is enabled on
staging.

## Google OAuth Config

Register the staging callback URL in both Supabase and the Google OAuth client:

- `https://staging.golfdataviz.com/auth/callback`

The app already sends Google OAuth users back through `/auth/callback` with a
safe `next` param so claim flows can resume on `/strokes-gained`.

## Deterministic Playwright Smoke

The browser smoke does not drive Google OAuth. Instead it:

1. Signs in with a dedicated email/password test user.
2. Creates a claimable anonymous round directly in Supabase.
3. Seeds `pending-oauth-claim` in `localStorage`.
4. Loads `/strokes-gained` and verifies the client auto-claims the round.

Required local/staging test env vars:

- `PLAYWRIGHT_E2E_EMAIL`
- `PLAYWRIGHT_E2E_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET` when hitting the protected staging domain from automation

Use a dedicated non-admin user in the same Supabase project as the app.

## Manual Staging Checklist

- Save a round anonymously and confirm it produces claimable state.
- Click the post-save Google CTA and confirm the browser redirects through
  `/auth/callback`.
- Confirm the app returns to `/strokes-gained`.
- Confirm the round auto-claims and appears in history.
- Force a failed Google initiation and confirm `pending-oauth-claim` does not
  survive for a later visit.

## Protected Staging Smoke

GitHub Actions runs remote smoke coverage for `staging` pushes and manual
dispatches via `.github/workflows/staging-smoke.yml`.

Required repo secrets:

- `VERCEL_TOKEN`
- `VERCEL_AUTOMATION_BYPASS_SECRET`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_PLAYWRIGHT_E2E_EMAIL`
- `STAGING_PLAYWRIGHT_E2E_PASSWORD`

The workflow hits `https://staging.golfdataviz.com` directly, bypasses Vercel
deployment protection with the automation secret, runs the existing remote smoke
spec, then runs the OAuth claim handoff spec with self-seeded ephemeral data.

## Manual QA Seed

Use the manual seed to reset the dedicated staging QA accounts to a deterministic
baseline:

```bash
npm run seed:staging:manual
```

Required local env vars:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_QA_PASSWORD`
- `STAGING_BASE_URL` (optional, defaults to `https://staging.golfdataviz.com`)

The seed is idempotent. Rerunning it only resets QA-owned staging rows for the
dedicated QA accounts; it does not wipe the rest of staging.

Seeded QA accounts:

- `qa-empty@staging.golfdataviz.local` — free account with `0` rounds
- `qa-starter@staging.golfdataviz.local` — free account with `2` rounds
- `qa-history@staging.golfdataviz.local` — free account with `5` rounds, one
  pre-created share token, one trouble-context round, and one legacy
  methodology row
- `qa-premium@staging.golfdataviz.local` — premium account with `8` rounds for
  lesson prep flow validation
