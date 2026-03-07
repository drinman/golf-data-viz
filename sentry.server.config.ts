import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN?.trim() || undefined;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
});
