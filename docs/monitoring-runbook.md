# Monitoring Runbook (Launch)

## Sentry Setup

1. Set `SENTRY_DSN` in Vercel production environment variables.
2. Optional: set `NEXT_PUBLIC_SENTRY_DSN` to capture browser/runtime errors directly.
3. Optional: set `NEXT_PUBLIC_SENTRY_RELEASE` for client-side release tagging.
4. Deploy once to activate `instrumentation.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`.

## Required Alert Rules

Configure these in Sentry before launch:

1. **Error spike alert**
   - Trigger: error count exceeds baseline over 5 minutes.
   - Notify: your primary launch channel (email/Slack).

2. **New high-severity issue alert**
   - Trigger: first-seen issue in production with high frequency.
   - Notify: same launch channel.

## Uptime Checks

The scheduled GitHub Action `.github/workflows/uptime-checks.yml` probes:

1. `/`
2. `/strokes-gained`
3. `/strokes-gained/og?d=<sample>`

Set repo variable `PRODUCTION_BASE_URL` to override the default `https://golfdataviz.com`.
Set repo secret `UPTIME_ALERT_SLACK_WEBHOOK` to receive failure alerts.

## Launch-Day Verification

1. Trigger uptime workflow manually (`workflow_dispatch`) and confirm green.
2. Trigger a controlled exception in a non-user-facing path and verify it appears in Sentry.
3. Confirm no active alert noise before posting to r/golf.
