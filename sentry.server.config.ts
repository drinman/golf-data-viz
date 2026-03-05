import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? "development",
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.1,
});
