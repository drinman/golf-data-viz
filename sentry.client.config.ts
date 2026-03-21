import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined;

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  release:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: 0.1,
});
